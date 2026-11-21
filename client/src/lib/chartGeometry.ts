export function polarPoint(longitude: number, radius: number, center: number) {
  const angle = ((longitude - 90) * Math.PI) / 180;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}
