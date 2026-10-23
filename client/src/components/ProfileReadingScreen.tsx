import { ChartOverview } from "@/components/ChartOverview";
import { InterpretationPanel } from "@/components/InterpretationPanel";
import { WelcomeHost } from "@/components/WelcomeHost";
import type { ChartResult } from "../../../server/astronomy";
import type { ReadingScope } from "../../../server/astrologyCore";

type ReadingView = "guided" | "evidence";

export type ProfileReadingScreenProps = {
  chart: ChartResult;
  readingView: ReadingView;
  onReadingViewChange: (view: ReadingView) => void;
  readingMode: ReadingScope;
  readingQuestion: string;
  interpreterPrompt: string | null;
  onClearInterpreterPrompt: () => void;
  onLoadSampleChart: () => void;
  onOpenProfileBuilder: () => void;
  onReadingModeChange: (mode: ReadingScope) => void;
};

export function ProfileReadingScreen({
  chart, readingView, onReadingViewChange, readingMode, readingQuestion, interpreterPrompt,
  onClearInterpreterPrompt, onLoadSampleChart, onOpenProfileBuilder, onReadingModeChange,
}: ProfileReadingScreenProps) {
  return <section aria-label="Personal reading and Master Interpreter" className="space-y-6">
    <ChartOverview chart={chart} view={readingView} onViewChange={onReadingViewChange} />
    <div id="master-interpreter-section" className="scroll-mt-24">
      <WelcomeHost
        chart={chart}
        readingMode={readingMode}
        onLoadSampleChart={onLoadSampleChart}
        onOpenProfileBuilder={onOpenProfileBuilder}
        externalPrompt={interpreterPrompt}
        onClearExternalPrompt={onClearInterpreterPrompt}
      />
    </div>
    <InterpretationPanel
      key={`${chart.input.location || "god"}:${chart.input.date || "live"}:${chart.input.time || "none"}:${chart.worldview}`}
      chart={chart}
      initialMode={readingMode}
      initialQuestion={readingQuestion}
      onModeChange={onReadingModeChange}
    />
  </section>;
}
