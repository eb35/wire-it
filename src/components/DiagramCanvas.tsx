import {
  applyNodeChanges,
  Background,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { locationSize, nearestLocation } from "../domain/layout";
import { PALETTE_MIME, parsePalette } from "../domain/palette";
import type { Location, Point } from "../domain/types";
import { useDiagramStore } from "../store/useDiagramStore";
import { CableEdge, type CableEdgeData } from "./canvas/CableEdge";
import { LocationNode, type LocationNodeData } from "./canvas/LocationNode";
import { NoteNode } from "./canvas/NoteNode";

const nodeTypes = { location: LocationNode, note: NoteNode };
const edgeTypes = { cable: CableEdge };

function toLocationData(location: Location): LocationNodeData {
  return {
    kind: location.kind,
    label: location.label,
    code: location.code,
    capacity: location.capacity,
    slots: location.slots,
    spaces: location.spaces,
    breakers: location.breakers,
    externalRef: location.externalRef,
  };
}

function toNodes(locations: Location[], notes: { id: string; text: string; position: Point }[]): Node[] {
  return [
    ...locations.map((location) => {
      const size = locationSize(location);
      return {
        id: location.id,
        type: "location" as const,
        position: location.position,
        width: size.width,
        height: size.height,
        data: toLocationData(location),
      };
    }),
    ...notes.map((note) => ({
      id: note.id,
      type: "note" as const,
      position: note.position,
      data: { text: note.text },
    })),
  ];
}

function DiagramCanvasInner() {
  const project = useDiagramStore((state) => state.project);
  const connectType = useDiagramStore((state) => state.connectType);
  const connectFrom = useDiagramStore((state) => state.connectFrom);
  const moveNode = useDiagramStore((state) => state.moveNode);
  const addLocation = useDiagramStore((state) => state.addLocation);
  const addNote = useDiagramStore((state) => state.addNote);
  const placeDevice = useDiagramStore((state) => state.placeDevice);
  const beginConnect = useDiagramStore((state) => state.beginConnect);
  const setSelection = useDiagramStore((state) => state.setSelection);
  const deleteSelection = useDiagramStore((state) => state.deleteSelection);
  const cancelConnect = useDiagramStore((state) => state.cancelConnect);
  const connectByHandles = useDiagramStore((state) => state.connectByHandles);
  const reconnectCable = useDiagramStore((state) => state.reconnectCable);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes] = useState<Node[]>(() => toNodes(project.locations, project.notes));

  useEffect(() => {
    const selectedId = useDiagramStore.getState().selection?.id;
    setNodes((current) => {
      const previous = new Map(current.map((node) => [node.id, node]));
      return toNodes(project.locations, project.notes).map((node) => {
        const prior = previous.get(node.id);
        return {
          ...node,
          selected: Boolean(prior?.selected || node.id === selectedId),
          position:
            prior && "dragging" in prior && prior.dragging ? prior.position : node.position,
        };
      });
    });
  }, [project.id, project.locations, project.notes]);

  const edges = useMemo<Edge<CableEdgeData>[]>(
    () =>
      project.cables.map((cable) => ({
        id: cable.id,
        type: "cable",
        source: cable.source,
        target: cable.target,
        sourceHandle: cable.sourceHandle,
        targetHandle: cable.targetHandle,
        reconnectable: true,
        data: {
          type: cable.type,
          label: cable.label,
          color: cable.color,
          waypoints: cable.waypoints,
        },
      })),
    [project.cables],
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const dropAt = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const payload = parsePalette(event.dataTransfer.getData(PALETTE_MIME));
      if (!payload) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      if (payload.section === "note") {
        addNote(position);
        return;
      }
      if (payload.section === "location") {
        addLocation(
          payload.kind === "box"
            ? { kind: "box", capacity: payload.capacity }
            : { kind: payload.kind },
          position,
        );
        return;
      }
      const hit = nearestLocation(project.locations, position);
      if (payload.section === "device") {
        if (hit) placeDevice(hit.id, payload.device);
        return;
      }
      if (payload.section === "cable") {
        beginConnect(payload.type, hit?.id);
      }
    },
    [addLocation, addNote, beginConnect, placeDevice, project.locations, screenToFlowPosition],
  );

  return (
    <div
      className="relative min-h-0 min-w-0 flex-1"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={dropAt}
    >
      {connectType ? (
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded border border-sky-700 bg-zinc-950/90 px-2 py-1 text-xs text-sky-300">
          {connectFrom
            ? `Click another box, or drag node-to-node, to finish the ${connectType} run — Esc to cancel`
            : `Drag from a node to another box, or click two boxes, for a ${connectType} run — Esc to cancel`}
        </div>
      ) : null}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={(_event, node) => moveNode(node.id, node.position)}
        onNodeClick={(_event, node) => {
          setSelection({
            kind: node.type === "note" ? "note" : "location",
            id: node.id,
          });
        }}
        onEdgeClick={(_event, edge) => {
          setSelection({ kind: "cable", id: edge.id });
        }}
        onConnect={(connection: Connection) => {
          if (!connection.source || !connection.target) return;
          connectByHandles({
            sourceId: connection.source,
            targetId: connection.target,
            sourceHandle: connection.sourceHandle ?? "s-r1",
            targetHandle: connection.targetHandle ?? "t-l1",
          });
        }}
        onReconnect={(oldEdge, connection) => {
          if (!connection.source || !connection.target) return;
          reconnectCable(oldEdge.id, {
            sourceId: connection.source,
            targetId: connection.target,
            sourceHandle: connection.sourceHandle ?? oldEdge.sourceHandle ?? "s-r1",
            targetHandle: connection.targetHandle ?? oldEdge.targetHandle ?? "t-l1",
          });
        }}
        edgesReconnectable
        isValidConnection={(connection) =>
          Boolean(connection.source && connection.target && connection.source !== connection.target)
        }
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.Step}
        onPaneClick={() => {
          if (connectType) return;
          setSelection(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") cancelConnect();
          if (event.key === "Delete" || event.key === "Backspace") {
            const target = event.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
            event.preventDefault();
            deleteSelection();
          }
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
        className="h-full w-full"
      >
        <Background gap={20} color="#27272a" />
        <Controls />
        <MiniMap pannable zoomable maskColor="rgba(9,9,11,0.7)" nodeColor="#3f3f46" />
      </ReactFlow>
    </div>
  );
}

export function DiagramCanvas() {
  return (
    <ReactFlowProvider>
      <DiagramCanvasInner />
    </ReactFlowProvider>
  );
}
