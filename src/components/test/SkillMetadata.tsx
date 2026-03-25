import type { AgentSkill } from "../../bindings";

interface SkillMetadataProps {
  skill: AgentSkill;
  onExampleClick?: (example: unknown) => void;
}

function buildSubLine(skill: AgentSkill): string {
  const parts: string[] = ["skill"];
  if (skill.id !== skill.name) parts.push(skill.id);
  const inModes = (skill.inputModes ?? []).join(" + ");
  const outModes = (skill.outputModes ?? []).join(" + ");
  if (inModes) parts.push(`${inModes} in`);
  if (outModes) parts.push(`${outModes} out`);
  return parts.join(" · ");
}

export function SkillMetadata({ skill }: SkillMetadataProps) {
  return (
    <div>
      {/* Skill name */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--text-primary)",
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        }}
      >
        {skill.name}
      </div>

      {/* Compact ID line */}
      <div
        style={{
          fontSize: 10,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          marginTop: 2,
        }}
      >
        {buildSubLine(skill)}
      </div>
    </div>
  );
}
