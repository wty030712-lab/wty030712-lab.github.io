// Map a mouse or touch gesture to the same two fingertip samples as the camera.
export function startPointer(canvas) {
 const contacts = new Map(), points = new Float32Array(20);
 const frame = { count: 0, points, time: -Infinity };
 window.wordDefenseHands = frame;
 let hovering = null, animation;
 function position(event) {
  const rect = canvas.getBoundingClientRect();
  return {x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height};
 }
 function down(event) {
  canvas.setPointerCapture(event.pointerId);
  contacts.set(event.pointerId, position(event));
 }
 function move(event) {
  const point = position(event);
  if (contacts.has(event.pointerId)) contacts.set(event.pointerId, point);
  if (event.pointerType === 'mouse') hovering = point;
 }
 function release(event) { contacts.delete(event.pointerId); }
 function leave() { hovering = null; }
 function draw(now) {
  const tips = Array.from(contacts.values()).slice(0, 2);
  if (!tips.length && hovering) tips.push(hovering);
  if (tips.length === 1) {
   const center = tips[0];
   tips[0] = {x: Math.max(.01, center.x - .105), y: center.y};
   tips.push({x: Math.min(.99, center.x + .105), y: center.y});
  }
  tips.forEach(({x,y}, hand) => {
   // The native input provider applies camera mirroring when it reads the frame.
   points.set([1-x,y,1-x,y+.035,1-x+.065,y+.025,1-x,y+.13,1-x,y+.06], hand*10);
  });
  frame.count = tips.length;
  frame.time = now;
  animation = requestAnimationFrame(draw);
 }
 canvas.addEventListener('pointerdown',down);
 canvas.addEventListener('pointermove',move);
 canvas.addEventListener('pointerup',release);
 canvas.addEventListener('pointercancel',release);
 canvas.addEventListener('lostpointercapture',release);
 canvas.addEventListener('pointerleave',leave);
 animation=requestAnimationFrame(draw);
 return () => {
  cancelAnimationFrame(animation);
  canvas.removeEventListener('pointerdown',down);
  canvas.removeEventListener('pointermove',move);
  canvas.removeEventListener('pointerup',release);
  canvas.removeEventListener('pointercancel',release);
  canvas.removeEventListener('lostpointercapture',release);
  canvas.removeEventListener('pointerleave',leave);
  contacts.clear(); frame.count=0; frame.time=-Infinity;
 };
}
