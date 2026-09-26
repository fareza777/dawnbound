import fs from 'node:fs';
const base='store/launch-en/trailer/src/';
let text=fs.readFileSync(base+'Campaign.tsx','utf8');
const extract=(name)=>{const start=text.indexOf('export const '+name+' =');if(start<0)throw new Error(name);let end=text.indexOf('export const ',start+1);if(end<0)end=text.length;const code=text.slice(start,end);text=text.slice(0,start)+text.slice(end);return code;};
const dust=extract('Dust'),backdrop=extract('Backdrop'),brand=extract('Brand');
fs.writeFileSync(base+'Visuals.tsx','import {AbsoluteFill,Img,staticFile,useCurrentFrame} from "remotion";\nconst font="Arial, sans-serif";\n'+dust+backdrop+brand);
fs.mkdirSync(base+'scenes',{recursive:true});
const imports={PromoScene:'AbsoluteFill,Img,OffthreadVideo,staticFile,useCurrentFrame,useVideoConfig,interpolate,spring',Hook:'AbsoluteFill,Img,staticFile,useCurrentFrame,useVideoConfig,interpolate',Finale:'AbsoluteFill,Img,staticFile,useCurrentFrame,useVideoConfig,interpolate'};
for(const name of Object.keys(imports)){
 const code=extract(name);const visuals=name==='PromoScene'?'Backdrop,Brand':name==='Hook'?'Dust':'Dust,Brand';
 fs.writeFileSync(base+`scenes/${name}.tsx`,`import {${imports[name]}} from "remotion";\nimport {${visuals}} from "../Visuals";\nconst font="Arial, sans-serif";\n`+code);
}
text=text.replace(/import \{[\s\S]*?\} from "remotion";/,'import {AbsoluteFill,Img,Audio,Sequence,staticFile,interpolate} from "remotion";\nimport {Backdrop} from "./Visuals";\nimport {PromoScene} from "./scenes/PromoScene";\nimport {Hook} from "./scenes/Hook";\nimport {Finale} from "./scenes/Finale";');
fs.writeFileSync(base+'Campaign.tsx',text);
