export const cleanWorkspaceTags = (text: string | undefined) => {
  if (!text) return "";
  return text.replace(/<wsm_workspace_action[\s\S]*?\/>/gi, "").trim();
};
