import { Composition, Folder } from 'remotion';
import { FPS, W, H, framesOf, type Brief } from './brand';
import { TikTok } from './TikTok';
import { briefs } from './tiktoks';
import { briefs2 } from './tiktoks2';
import './fonts';

const Cut = ({ brief }: { brief: Brief }) => <Composition id={brief.id} component={TikTok} width={W} height={H} fps={FPS} durationInFrames={framesOf(brief)} defaultProps={{ brief }} />;

export const RemotionRoot = () => (
  <Folder name="TikTok">
    {[...briefs, ...briefs2].map((b) => <Cut key={b.id} brief={b} />)}
  </Folder>
);
