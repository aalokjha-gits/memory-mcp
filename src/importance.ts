export function autoImportance(content: string, type: string): number {
  let score = 0.5;
  const text = content.toLowerCase();
  
  if (content.length > 500) score += 0.1;
  if (content.length > 1000) score += 0.1; // additional
  
  if (content.includes("```")) score += 0.15;
  if (content.includes("http://") || content.includes("https://")) score += 0.05;
  
  if (text.includes("important") || text.includes("critical") || text.includes("must") || text.includes("never") || text.includes("always")) {
    score += 0.15;
  }
  if (text.includes("security") || text.includes("auth") || text.includes("password") || text.includes("secret") || text.includes("key")) {
    score += 0.1;
  }
  if (text.includes("architecture") || text.includes("design") || text.includes("system")) {
    score += 0.1;
  }
  
  if (type === "decision") score += 0.1;
  if (type === "debug") score += 0.05;
  
  return Math.max(0, Math.min(1, score));
}
