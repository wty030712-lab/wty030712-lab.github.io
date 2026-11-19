import {FilesetResolver,HandLandmarker} from './vision/vision_bundle.mjs';

let stream, detector, video, scheduled=0, generation=0;
const frame={count:0,time:-Infinity,points:new Float32Array(20)};
const landmarkIds=[8,6,4,0,9];
window.wordDefenseHands=frame;

export function stopHands(){
 generation++;
 window.wordDefenseCameraActive=false;
 cancelAnimationFrame(scheduled);
 frame.count=0;
 frame.time=-Infinity;
 if(stream)for(const track of stream.getTracks())track.stop();
 if(video)video.srcObject=null;
 if(detector)detector.close();
 stream=detector=video=null;
}

export async function startHands(element,onLost){
 stopHands();
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('请使用支持摄像头的 HTTPS 浏览器。');
 const session=generation;
 const activeStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480}}});
 if(session!==generation){activeStream.getTracks().forEach(t=>t.stop());throw Error('摄像头已关闭。');}
 stream=activeStream;
 video=element;
 video.srcObject=stream;
 const lost=message=>{if(session===generation){stopHands();onLost(message);}};
 stream.getVideoTracks()[0].onended=()=>lost('摄像头已断开。重新连接后可以继续。');
 await video.play();
 const files=await FilesetResolver.forVisionTasks('./vision/wasm');
 const activeDetector=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'./StreamingAssets/hand_landmarker.bytes'},runningMode:'VIDEO',numHands:2});
 if(session!==generation){activeDetector.close();throw Error('摄像头已关闭。');}
 detector=activeDetector;
 window.wordDefenseCameraActive=true;
 let lastVideo=-1, lastTime=-Infinity;
 function sample(now){
  if(session!==generation)return;
  if(!document.hidden&&video.readyState>=2&&video.currentTime!==lastVideo&&now-lastTime>=40){
   lastVideo=video.currentTime;lastTime=now;
   try{
    const {landmarks}=detector.detectForVideo(video,now);
    frame.count=Math.min(2,landmarks.length);
    for(let hand=0;hand<frame.count;hand++){
     for(let i=0;i<landmarkIds.length;i++){
      const p=landmarks[hand][landmarkIds[i]],offset=hand*10+i*2;
      frame.points[offset]=p.x;frame.points[offset+1]=p.y;
     }
    }
    frame.time=now;
   }catch{lost('手势识别已中断，点击按钮重新打开。');return;}
  }
  scheduled=requestAnimationFrame(sample);
 }
 scheduled=requestAnimationFrame(sample);
}
