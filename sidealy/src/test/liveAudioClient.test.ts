import { describe, expect, it } from "vitest";
import {
  getVoiceForWay,
  WAY_VOICE_MAP,
} from "../services/liveAudioClient";

describe("liveAudioClient Voice Mapping Contract", () => {
  it("maps each Voie to its official Gemini voice actor", () => {
    expect(WAY_VOICE_MAP.ninja).toBe("Puck");
    expect(WAY_VOICE_MAP.mage).toBe("Kore");
    expect(WAY_VOICE_MAP.hunter).toBe("Fenrir");
    expect(WAY_VOICE_MAP.professional).toBe("Charon");
  });

  it("getVoiceForWay correctly resolves voices case-insensitively", () => {
    expect(getVoiceForWay("ninja")).toBe("Puck");
    expect(getVoiceForWay("Ninja")).toBe("Puck");
    expect(getVoiceForWay("NINJA")).toBe("Puck");

    expect(getVoiceForWay("mage")).toBe("Kore");
    expect(getVoiceForWay("Mage")).toBe("Kore");

    expect(getVoiceForWay("hunter")).toBe("Fenrir");
    expect(getVoiceForWay("Hunter")).toBe("Fenrir");

    expect(getVoiceForWay("professional")).toBe("Charon");
    expect(getVoiceForWay("Professional")).toBe("Charon");
  });

  it("getVoiceForWay safely falls back to Puck for undefined, empty, or unknown ways", () => {
    expect(getVoiceForWay(null)).toBe("Puck");
    expect(getVoiceForWay(undefined)).toBe("Puck");
    expect(getVoiceForWay("")).toBe("Puck");
    expect(getVoiceForWay("unknown-way")).toBe("Puck");
  });
});
