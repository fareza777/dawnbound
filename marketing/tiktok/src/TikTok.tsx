import type { Brief } from './brand';
import { Soundtrack, Stage } from './formats';

export const TikTok = ({ brief }: { brief: Brief }) => (
  <>
    <Stage brief={brief} />
    <Soundtrack brief={brief} />
  </>
);
