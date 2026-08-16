import type { Node, NodeProps } from "@xyflow/react";

export type NoteNodeData = {
  text: string;
};

export function NoteNode({ data, selected }: NodeProps<Node<NoteNodeData>>) {
  return (
    <div
      className={[
        "h-[110px] w-[200px] rounded-sm px-3 py-2 text-zinc-950",
        selected ? "outline outline-2 outline-sky-400" : "",
      ].join(" ")}
      style={{ background: "#E4B84A" }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide">Note</div>
      <div className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs">{data.text}</div>
    </div>
  );
}
