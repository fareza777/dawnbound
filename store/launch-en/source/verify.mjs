import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve('store/launch-en');
const ffprobe=path.join(root,'trailer/node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe');
const ffmpeg=path.join(root,'trailer/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
const checks=[];
for(const [name,w,h] of [['App-Icon',512,512],['Feature-Graphic',1024,500],...Array.from({length:8},(_,i)=>[`Store-${i+1}`,1080,1920])]){
 const file=path.join(root,'exports',name+'.png');const b=fs.readFileSync(file);
 const result={file:name+'.png',width:b.readUInt32BE(16),height:b.readUInt32BE(20),colorType:b[25],bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};
 if(result.width!==w||result.height!==h||result.colorType!==2)throw new Error('Image spec mismatch: '+name);
 checks.push(result);
}
for(const [name,w,h] of [['Dawnbound-Landscape',1920,1080],['Dawnbound-Vertical',1080,1920]]){
 const file=path.join(root,'exports',name+'.mp4');
 const info=JSON.parse(execFileSync(ffprobe,['-v','error','-show_format','-show_streams','-of','json',file],{encoding:'utf8'}));
 const v=info.streams.find(s=>s.codec_type==='video'),a=info.streams.find(s=>s.codec_type==='audio');
 if(v.width!==w||v.height!==h||v.codec_name!=='h264'||v.r_frame_rate!=='30/1'||!a||Math.abs(Number(info.format.duration)-28)>.1)throw new Error('Video spec mismatch: '+name);
 execFileSync(ffmpeg,['-v','error','-i',file,'-c:v','rawvideo','-c:a','pcm_s16le','-f','null','-'],{stdio:'pipe'});
 checks.push({file:name+'.mp4',width:v.width,height:v.height,fps:v.r_frame_rate,codec:v.codec_name,audio:a.codec_name,duration:Number(info.format.duration),bytes:Number(info.format.size),fullDecode:'passed'});
}
fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify({verifiedAt:new Date().toISOString(),checks},null,2));
console.log('PASS: 10 images, 2 videos, sizes, RGB PNG, H.264, 30fps, audio, 28-second duration, full video decode.');
