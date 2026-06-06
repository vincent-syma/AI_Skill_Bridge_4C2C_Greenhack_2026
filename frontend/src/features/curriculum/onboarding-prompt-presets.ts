export const ONBOARDING_SAMPLE_EMAIL = `Subject: Team update

Hi team,

Wanted to tell you about the thing from yesterday meeting. We need everyone do the new process ASAP because leadership said so. Let me know.

Thanks`;

export const ONBOARDING_PROMPT_PRESETS = {
  weak: "Make this email better.",
  system:
    "You are a helpful writing assistant. Keep the same facts and intent. Output only the rewritten email.",
  user: ONBOARDING_SAMPLE_EMAIL,
  chatSystem: "You are a helpful writing assistant. Be concise and professional.",
};
