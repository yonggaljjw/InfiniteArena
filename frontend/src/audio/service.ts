// 역할: Vue/Phaser가 공유하는 유일한 오디오 서비스. 실제 Phaser Sound Manager만 사용합니다.
// 전투 이벤트는 기존 V3 중복 제거 이후 수신합니다. HP/명중/성장/리스폰을 클라이언트에서 결정하지 않습니다.
import Phaser from "phaser";
import { watch, type WatchStopHandle } from "vue";
import { ui } from "../shared/bridge";
import type { CombatEvent, Snapshot } from "../shared/protocol";
import { audioSettings, audioState } from "./settings";
import { audioKey, manifest, type BgmId, type SfxId } from "./manifest";
type Sound = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
type Voice = {
  id: SfxId;
  sound: Sound;
  gain: number;
  priority: number;
  started: number;
};
type Music = { id: BgmId; sound: Sound; envelope: number };

class AudioService {
  private scene?: Phaser.Scene;
  private music: Music[] = [];
  private voices: Voice[] = [];
  private last = new Map<SfxId, number>();
  private stops: WatchStopHandle[] = [];
  private activated = false;
  private requested = false;
  private hidden = document.hidden;
  private desired: BgmId = "menu";
  private epoch = "";
  private previous?: { id: string; alive: boolean };
  private pending?: { id: string; offer: number; level: number; at: number };
  private limiter?: DynamicsCompressorNode;
  private generation = 0;
  private played: Partial<Record<SfxId, number>> = {};
  private dropped = 0;
  private duckUntil = 0;
  private duck = 1;

  // 하나의 Scene만 연결합니다. 재생 객체/DOM 리스너/반응형 구독은 detach에서 모두 회수합니다.
  attach(scene: Phaser.Scene) {
    this.detach();
    this.scene = scene;
    scene.sound.pauseOnBlur = false; // 탭 가림 정책은 아래 visibility 핸들러 하나로 관리합니다.
    this.hidden = document.hidden;
    this.desired = ui.playerId ? "world" : "menu";
    const missing = [
      ...Object.keys(manifest.bgm),
      ...Object.keys(manifest.sfx),
    ].filter((id) => !scene.cache.audio.exists(audioKey(id)));
    audioState.missing = missing.length;
    audioState.status =
      missing.length ===
        Object.keys(manifest.bgm).length + Object.keys(manifest.sfx).length ||
      scene.sound instanceof Phaser.Sound.NoAudioSoundManager
        ? "unavailable"
        : "locked";
    if (audioState.status === "unavailable") return;
    for (const id of Object.keys(manifest.bgm) as BgmId[]) {
      if (!scene.cache.audio.exists(audioKey(id))) continue;
      try {
        this.music.push({
          id,
          sound: scene.sound.add(audioKey(id), {
            loop: true,
            volume: 0,
          }) as Sound,
          envelope: 0,
        });
      } catch {
        audioState.missing++;
      }
    }
    // 여러 소리가 한 순간 겹쳐도 출력이 과도하게 커지지 않도록 기존 Phaser 출력에 가벼운 제한기를 연결합니다.
    if (scene.sound instanceof Phaser.Sound.WebAudioSoundManager) {
      const context = scene.sound.context,
        limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 6;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.005;
      limiter.release.value = 0.12;
      scene.sound.masterVolumeNode.disconnect(context.destination);
      scene.sound.masterVolumeNode.connect(limiter);
      limiter.connect(context.destination);
      this.limiter = limiter;
    }
    scene.sound.on("unlocked", this.unlocked);
    document.addEventListener("pointerdown", this.gesture, true);
    document.addEventListener("keydown", this.gesture, true);
    document.addEventListener("click", this.click, true);
    document.addEventListener("pointerover", this.hover, true);
    document.addEventListener("visibilitychange", this.visibility);
    this.stops.push(
      watch(audioSettings, () => this.applyVolumes(), {
        deep: true,
        flush: "sync",
      }),
    );
    this.stops.push(
      watch(
        () => ui.playerId,
        (id) => {
          this.desired = id ? "world" : "menu";
          this.previous = undefined;
          this.pending = undefined;
          this.epoch = "";
          this.last.clear();
          for (const voice of this.voices) voice.sound.stop();
        },
        { flush: "sync" },
      ),
    );
    this.applyVolumes();
  }

  // 명시적 사용자 입력에서만 최초 활성화합니다. 자동 재생 정책을 우회하는 무음 재생 트릭은 사용하지 않습니다.
  enable = (event?: Event) => {
    if (event && !event.isTrusted) return;
    this.requested = true;
    const scene = this.scene;
    if (!scene || audioState.status === "unavailable") return;
    if (scene.sound instanceof Phaser.Sound.WebAudioSoundManager) {
      const version = this.generation;
      scene.sound.context
        .resume()
        .then(() => {
          if (version !== this.generation || document.hidden) return;
          this.activated =
            scene.sound instanceof Phaser.Sound.WebAudioSoundManager &&
            scene.sound.context.state === "running";
          audioState.status = this.activated ? "ready" : "locked";
        })
        .catch(() => {
          if (version === this.generation) audioState.status = "locked";
        });
    } else this.unlocked();
  };
  private gesture = (event: Event) => {
    if (event.isTrusted && !this.activated) this.enable(event);
  };
  private unlocked = () => {
    if (!this.requested) return;
    this.activated = true;
    audioState.status = "ready";
  };

  // UI 소리는 DOM 이벤트를 중앙에서 처리합니다. 키보드로 버튼을 누를 때의 click도 같은 경로를 사용합니다.
  private click = (event: Event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>("button")
        : null;
    if (!event.isTrusted || !button || button.disabled) return;
    this.play("ui_click");
    if (button.dataset.choice && ui.snapshot) {
      const me = ui.snapshot.players.find((p) => p.id === ui.playerId);
      if (me?.alive && ui.snapshot.choices.includes(button.dataset.choice)) {
        this.pending = {
          id: me.id,
          offer: ui.snapshot.offer_id,
          level: me.level,
          at: performance.now(),
        };
      }
    }
  };
  private hover = (event: Event) => {
    if (!(event.target instanceof Element)) return;
    const card = event.target.closest<HTMLButtonElement>("button[data-choice]");
    if (
      card &&
      !card.disabled &&
      !(
        event instanceof PointerEvent &&
        event.relatedTarget instanceof Node &&
        card.contains(event.relatedTarget)
      )
    )
      this.play("ui_hover");
  };

  // 탭을 숨기면 SFX는 버리고 BGM 위치만 일시정지합니다. 복귀 후 놓친 전투음을 몰아서 재생하지 않습니다.
  private visibility = () => {
    this.hidden = document.hidden;
    if (this.hidden) {
      for (const track of this.music)
        if (track.sound.isPlaying) track.sound.pause();
      for (const voice of this.voices) voice.sound.stop();
    } else if (this.activated) this.enable();
  };

  // 강화는 클릭이 아니라 같은 생존 세션의 다음 offer_id로 확정합니다. 사망/리스폰의 제안 증가를 성공으로 오인하지 않습니다.
  snapshot(snapshot: Snapshot) {
    if (snapshot.combat_epoch !== this.epoch) {
      this.last.clear();
      this.previous = undefined;
      this.pending = undefined;
      this.epoch = snapshot.combat_epoch ?? "";
    }
    const me = snapshot.players.find((p) => p.id === snapshot.you);
    if (!me) return;
    if (this.previous?.id === me.id && !this.previous.alive && me.alive)
      this.play("respawn");
    if (this.pending) {
      if (
        !me.alive ||
        me.id !== this.pending.id ||
        performance.now() - this.pending.at > 3000
      )
        this.pending = undefined;
      else if (
        snapshot.offer_id === this.pending.offer + 1 &&
        me.level >= this.pending.level
      ) {
        this.play("upgrade");
        this.pending = undefined;
      }
    }
    this.previous = { id: me.id, alive: me.alive };
  }

  // 기존 V3 이벤트 ID 중복 제거/8tick 제한 이후 호출됩니다. 보호 중에는 서버 hit가 없으므로 가짜 보호음을 생성하지 않습니다.
  combat(event: CombatEvent) {
    const snapshot = ui.snapshot;
    if (!snapshot) return;
    const me = snapshot.players.find((p) => p.id === snapshot.you);
    if (!me) return;
    const local = event.owner === snapshot.you,
      ownTarget = event.target === snapshot.you;
    const distance = Math.hypot(event.x - me.x, event.y - me.y);
    if (event.kind === "fire")
      this.play(event.weapon === "spread" ? "spread" : "shot", distance);
    else if (event.kind === "hit") {
      if (ownTarget) this.play("player_hit");
      else if (event.target_kind === "player") this.play("pvp_hit", distance);
      else
        this.play(
          event.weapon === "orbit"
            ? "orbit"
            : (event.damage ?? 0) >= 25
              ? "heavy_hit"
              : "monster_hit",
          distance,
        );
    } else if (event.kind === "death") {
      if (ownTarget) this.play("player_death");
      else if (event.target_kind === "player" && local) this.play("pvp_kill");
      else if (event.target_kind === "monster")
        this.play("monster_death", distance);
    } else if (local)
      this.play(event.kind === "level_up" ? "level_up" : "experience");
  }

  // 종류별 간격/동시 수와 전역 12개를 제한합니다. 포화 시 낮은 우선순위의 오래된 소리만 선점합니다.
  play(id: SfxId, distance = 0) {
    const scene = this.scene,
      spec = manifest.sfx[id],
      now = performance.now();
    if (
      !scene ||
      !this.activated ||
      this.hidden ||
      audioSettings.muted ||
      !audioSettings.master ||
      !audioSettings.sfx ||
      !scene.cache.audio.exists(audioKey(id))
    )
      return false;
    const attenuation =
      distance <= 90
        ? 1
        : Math.max(0, 1 - (distance - 90) / (manifest.maxDistance - 90)) ** 2;
    if (
      !attenuation ||
      now - (this.last.get(id) ?? -Infinity) < spec.cooldownMs
    ) {
      this.dropped++;
      return false;
    }
    const active = this.voices.filter((v) => v.sound.isPlaying);
    if (active.filter((v) => v.id === id).length >= spec.voices) {
      this.dropped++;
      return false;
    }
    if (active.length >= manifest.globalVoiceLimit) {
      const victim = active.sort(
        (a, b) => a.priority - b.priority || a.started - b.started,
      )[0];
      if (victim.priority >= spec.priority) {
        this.dropped++;
        return false;
      }
      victim.sound.stop();
    }
    let voice = this.voices.find((v) => v.id === id && !v.sound.isPlaying);
    try {
      if (!voice) {
        if (this.voices.filter((v) => v.id === id).length >= spec.voices)
          return false;
        voice = {
          id,
          sound: scene.sound.add(audioKey(id)) as Sound,
          gain: 0,
          priority: spec.priority,
          started: now,
        };
        this.voices.push(voice);
      }
      voice.gain = spec.gain * attenuation;
      voice.started = now;
      const ok = voice.sound.play({
        volume: (voice.gain * audioSettings.sfx) / 100,
      });
      if (!ok) return false;
      if (spec.priority >= 85) this.duckUntil = now + 500;
      this.last.set(id, now);
      this.played[id] = (this.played[id] ?? 0) + 1;
      return true;
    } catch {
      this.dropped++;
      return false;
    }
  }

  // 공통 Master/Mute와 두 채널을 즉시 반영합니다. 이미 재생 중인 SFX의 거리 감쇠도 유지합니다.
  private applyVolumes() {
    if (!this.scene) return;
    this.scene.sound.volume = audioSettings.master / 100;
    this.scene.sound.mute = audioSettings.muted;
    for (const track of this.music)
      track.sound.setVolume(
        ((track.envelope * audioSettings.bgm) / 100) * this.duck,
      );
    for (const voice of this.voices)
      voice.sound.setVolume((voice.gain * audioSettings.sfx) / 100);
  }

  // 두 BGM 객체만 사용합니다. 같은 트랙은 재시작하지 않고 900ms 교차 페이드 종료 후 이전 트랙을 정지합니다.
  update(delta: number) {
    if (!this.scene || !this.activated || this.hidden) return;
    // 피격/레벨업/처치 같은 중요한 소리 동안 BGM만 짧고 부드럽게 낮춥니다. 설정 수치는 변경하지 않습니다.
    this.duck +=
      ((performance.now() < this.duckUntil ? 0.55 : 1) - this.duck) *
      (1 - Math.exp(-delta / 100));
    const desired = this.music.some((t) => t.id === this.desired)
      ? this.desired
      : this.music[0]?.id;
    for (const track of this.music) {
      const target = track.id === desired ? 1 : 0;
      try {
        if (target && track.sound.isPaused) track.sound.resume();
        else if (target && !track.sound.isPlaying)
          track.sound.play({ loop: true, volume: 0 });
        const step = Math.min(delta, 100) / manifest.fadeMs;
        track.envelope +=
          Math.sign(target - track.envelope) *
          Math.min(Math.abs(target - track.envelope), step);
        track.sound.setVolume(
          ((track.envelope * audioSettings.bgm) / 100) * this.duck,
        );
        if (
          !target &&
          track.envelope === 0 &&
          (track.sound.isPlaying || track.sound.isPaused)
        )
          track.sound.stop();
      } catch {
        audioState.status = "unavailable";
        track.sound.stop();
      }
    }
  }

  // 개발 테스트는 실제 AudioContext 출력과 아래 상한을 함께 확인합니다. 운영에서 별도 전역 플레이어를 만들지 않습니다.
  stats() {
    return {
      desired: this.desired,
      activated: this.activated,
      hidden: this.hidden,
      status: audioState.status,
      missing: audioState.missing,
      bgm: this.music.map((t) => ({
        id: t.id,
        playing: t.sound.isPlaying,
        paused: t.sound.isPaused,
        gain: t.envelope,
        volume: t.sound.volume,
      })),
      allocated: this.voices.length,
      active: this.voices.filter((v) => v.sound.isPlaying).length,
      limit: manifest.globalVoiceLimit,
      allocatedLimit: Object.values(manifest.sfx).reduce(
        (sum, s) => sum + s.voices,
        0,
      ),
      played: { ...this.played },
      dropped: this.dropped,
    };
  }
  // Scene 종료/재연결 시 소유 객체·출력 노드·이벤트·구독을 회수하고 이전 비동기 활성화를 무효화합니다.
  detach() {
    this.generation++;
    this.scene?.sound.off("unlocked", this.unlocked);
    for (const stop of this.stops) stop();
    this.stops = [];
    document.removeEventListener("pointerdown", this.gesture, true);
    document.removeEventListener("keydown", this.gesture, true);
    document.removeEventListener("click", this.click, true);
    document.removeEventListener("pointerover", this.hover, true);
    document.removeEventListener("visibilitychange", this.visibility);
    for (const track of this.music) track.sound.destroy();
    for (const voice of this.voices) voice.sound.destroy();
    if (
      this.limiter &&
      this.scene?.sound instanceof Phaser.Sound.WebAudioSoundManager
    ) {
      const manager = this.scene.sound;
      manager.masterVolumeNode.disconnect(this.limiter);
      this.limiter.disconnect();
      if (manager.context.state !== "closed")
        manager.masterVolumeNode.connect(manager.context.destination);
    }
    this.limiter = undefined;
    this.music = [];
    this.voices = [];
    this.last.clear();
    this.previous = undefined;
    this.pending = undefined;
    this.duck = 1;
    this.duckUntil = 0;
    this.activated = false;
    this.requested = false;
    this.scene = undefined;
    this.played = {};
    this.dropped = 0;
    audioState.status = "loading";
    audioState.missing = 0;
  }
}
export const audio = new AudioService();
