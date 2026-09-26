import { Composition, Still } from "remotion";
import { Trailer, StoreCard, Feature, Icon } from "./Campaign";
export const RemotionRoot = () => (
  <>
    <Composition
      id="Dawnbound-Landscape"
      component={Trailer}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={840}
    />
    <Composition
      id="Dawnbound-Vertical"
      component={Trailer}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={840}
    />
    <Still id="Feature-Graphic" component={Feature} width={1024} height={500} />
    <Still id="App-Icon" component={Icon} width={512} height={512} />
    {Array.from({ length: 8 }, (_, index) => (
      <Still
        key={index}
        id={`Store-${index + 1}`}
        component={StoreCard}
        width={1080}
        height={1920}
        defaultProps={{ index }}
      />
    ))}
  </>
);
