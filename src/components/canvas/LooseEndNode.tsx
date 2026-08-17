import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useDiagramStore } from "../../store/useDiagramStore";

export type LooseEndData = {
  cableId: string;
};

export function LooseEndNode({ data, selected }: NodeProps<Node<LooseEndData>>) {
  const hidden = useDiagramStore(
    (state) =>
      (state.selection?.kind === "cable" && state.selection.id === data.cableId) ||
      state.draggingCableEnd?.cableId === data.cableId,
  );
  return (
    <div
      className={[
        "relative h-3 w-3 rounded-full border-2 bg-zinc-950",
        selected ? "border-sky-400" : "border-zinc-400",
        hidden ? "opacity-0" : "",
      ].join(" ")}
    >
      <Handle
        type="target"
        id="t-loose"
        position={Position.Left}
        style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)", opacity: 0 }}
      />
    </div>
  );
}
