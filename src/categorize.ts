export function autoCategory(content: string): string {
  const text = content.toLowerCase();
  
  if (text.includes("decided") || text.includes("chose") || text.includes("will use") || text.includes("going with") || text.includes("picked")) {
    return "decision";
  }
  if (text.includes("pattern") || text.includes("always") || text.includes("convention") || text.includes("standard") || text.includes("best practice")) {
    return "pattern";
  }
  if (text.includes("prefer") || text.includes("like") || text.includes("dislike") || text.includes("want") || text.includes("hate") || text.includes("favorite")) {
    return "preference";
  }
  if (text.includes("error") || text.includes("bug") || text.includes("fix") || text.includes("crash") || text.includes("issue") || text.includes("debug") || text.includes("stack trace")) {
    return "debug";
  }
  if (text.includes("context") || text.includes("working on") || text.includes("currently") || text.includes("project") || text.includes("sprint")) {
    return "context";
  }
  
  return "knowledge";
}
