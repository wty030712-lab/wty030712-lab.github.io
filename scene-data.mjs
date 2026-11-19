// Unity receives the original compressed data file as a single Blob.
const parts = [
 [
  "scene-00-50228296cea2.bin",
  8388608
 ],
 [
  "scene-01-a490ea48536a.bin",
  8388608
 ],
 [
  "scene-02-7152c380d6b5.bin",
  8388608
 ],
 [
  "scene-03-426cb6481e8f.bin",
  8388608
 ],
 [
  "scene-04-23fd0d767911.bin",
  8388608
 ],
 [
  "scene-05-a93ff390a69c.bin",
  8388608
 ],
 [
  "scene-06-558416e1baf7.bin",
  8388608
 ],
 [
  "scene-07-81549a67e933.bin",
  8388608
 ],
 [
  "scene-08-aa5d72e2d7aa.bin",
  894861
 ]
];
export async function loadSceneData(progress) {
 const total = parts.reduce((sum, part) => sum + part[1], 0);
 const blobs = new Array(parts.length);
 let next = 0, received = 0;
 progress(0);
 async function download() {
  while (next < parts.length) {
   const index = next++;
   const [name, bytes] = parts[index];
   const response = await fetch(new URL('Build/' + name, import.meta.url));
   if (!response.ok) throw Error('场景文件下载失败 (' + response.status + ')');
   const blob = await response.blob();
   if (blob.size !== bytes) throw Error('场景文件下载不完整，请重试。');
   blobs[index] = blob;
   received += bytes;
   progress(Math.round(100 * received / total));
  }
 }
 await Promise.all([download(), download(), download()]);
 return URL.createObjectURL(new Blob(blobs, {type:'application/octet-stream'}));
}
