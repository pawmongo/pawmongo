'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Code,
  ListTree,
  Check,
  AlertCircle,
  Database,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Search,
  Calendar,
  KeyRound,
  FileText,
  Brackets,
  Hash
} from 'lucide-react';

export interface TableFieldEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  docIndex: number;
  fieldName: string;
  initialValue: any;
  onSave: (docId: string, fieldName: string, newValue: any) => void;
  isDarkMode?: boolean;
}

export type DataType =
  | 'String'
  | 'Int32'
  | 'Double'
  | 'Boolean'
  | 'Date'
  | 'ObjectId'
  | 'Array'
  | 'Object'
  | 'Null';

export interface TreeNode {
  id: string;
  key: string;
  type: DataType;
  value: any;
  isExpanded: boolean;
}

const DATA_TYPES: { type: DataType; label: string; badgeColor: string }[] = [
  { type: 'String', label: 'String', badgeColor: 'text-[#00684a] dark:text-[#38bdf8]' },
  { type: 'Int32', label: 'Int32', badgeColor: 'text-[#0062d2] dark:text-[#60a5fa]' },
  { type: 'Double', label: 'Double', badgeColor: 'text-[#0284c7] dark:text-[#38bdf8]' },
  { type: 'Boolean', label: 'Boolean', badgeColor: 'text-[#7c3aed] dark:text-[#c084fc]' },
  { type: 'Date', label: 'Date', badgeColor: 'text-[#d97706] dark:text-[#fcd34d]' },
  { type: 'ObjectId', label: 'ObjectId', badgeColor: 'text-[#dc2626] dark:text-[#f87171]' },
  { type: 'Array', label: 'Array', badgeColor: 'text-[#475569] dark:text-[#94a3b8]' },
  { type: 'Object', label: 'Object', badgeColor: 'text-[#475569] dark:text-[#94a3b8]' },
  { type: 'Null', label: 'Null', badgeColor: 'text-[#64748b] dark:text-[#94a3b8]' }
];

function detectType(val: any): DataType {
  if (val === null || val === undefined) return 'Null';
  if (Array.isArray(val)) return 'Array';
  if (val instanceof Date) return 'Date';
  if (typeof val === 'boolean') return 'Boolean';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? 'Int32' : 'Double';
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
      return 'ObjectId';
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
      return 'Date';
    }
    return 'String';
  }
  if (typeof val === 'object') return 'Object';
  return 'String';
}

let counter = 0;
function generateNodeId(): string {
  return `node-${Date.now()}-${counter++}`;
}

function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const random = 'xxxxxxxxxxxxxxxx'
    .replace(/[x]/g, () => Math.floor(Math.random() * 16).toString(16))
    .toLowerCase();
  return (timestamp + random).substring(0, 24);
}

function rawToTree(val: any, key = 'root'): TreeNode {
  const t = detectType(val);
  const id = generateNodeId();

  if (t === 'Array') {
    const arr = Array.isArray(val) ? val : [];
    return {
      id,
      key,
      type: 'Array',
      value: arr.map((item, idx) => rawToTree(item, String(idx))),
      isExpanded: true,
    };
  }

  if (t === 'Object') {
    const obj = typeof val === 'object' && val !== null ? val : {};
    return {
      id,
      key,
      type: 'Object',
      value: Object.entries(obj).map(([k, v]) => rawToTree(v, k)),
      isExpanded: true,
    };
  }

  return {
    id,
    key,
    type: t,
    value: val,
    isExpanded: false,
  };
}

function treeToRaw(node: TreeNode): any {
  if (node.type === 'Array') {
    const children = Array.isArray(node.value) ? node.value : [];
    return children.map((child: TreeNode) => treeToRaw(child));
  }

  if (node.type === 'Object') {
    const children = Array.isArray(node.value) ? node.value : [];
    const obj: Record<string, any> = {};
    for (const child of children) {
      const k = child.key.trim();
      if (k) {
        obj[k] = treeToRaw(child);
      }
    }
    return obj;
  }

  if (node.type === 'Int32' || node.type === 'Double') {
    const n = Number(node.value);
    return isNaN(n) ? 0 : n;
  }

  if (node.type === 'Boolean') {
    return String(node.value) === 'true';
  }

  if (node.type === 'Null') {
    return null;
  }

  if (node.type === 'Date') {
    return String(node.value ?? '').trim() || new Date().toISOString();
  }

  if (node.type === 'ObjectId') {
    return String(node.value ?? '').trim() || generateObjectId();
  }

  return String(node.value ?? '');
}

function updateNodeAtPath(
  root: TreeNode,
  path: number[],
  updater: (node: TreeNode) => TreeNode
): TreeNode {
  if (path.length === 0) {
    return updater(root);
  }
  const [head, ...tail] = path;
  const children = Array.isArray(root.value) ? [...root.value] : [];
  if (head >= 0 && head < children.length) {
    children[head] = updateNodeAtPath(children[head], tail, updater);
  }
  return { ...root, value: children };
}

function deleteNodeAtPath(root: TreeNode, parentPath: number[], childIdx: number): TreeNode {
  return updateNodeAtPath(root, parentPath, (parent) => {
    const children = Array.isArray(parent.value) ? [...parent.value] : [];
    children.splice(childIdx, 1);
    if (parent.type === 'Array') {
      const reindexed = children.map((c, i) => ({ ...c, key: String(i) }));
      return { ...parent, value: reindexed };
    }
    return { ...parent, value: children };
  });
}

function addNodeAtPath(root: TreeNode, path: number[]): TreeNode {
  return updateNodeAtPath(root, path, (node) => {
    const children = Array.isArray(node.value) ? [...node.value] : [];
    if (node.type === 'Array') {
      const newChild = rawToTree('', String(children.length));
      return { ...node, value: [...children, newChild], isExpanded: true };
    }
    let count = children.length + 1;
    let newKey = `field_${count}`;
    while (children.some((c) => c.key === newKey)) {
      count++;
      newKey = `field_${count}`;
    }
    const newChild = rawToTree('', newKey);
    return { ...node, value: [...children, newChild], isExpanded: true };
  });
}

function setAllExpanded(node: TreeNode, expanded: boolean): TreeNode {
  const isBranch = node.type === 'Object' || node.type === 'Array';
  const newChildren = isBranch && Array.isArray(node.value)
    ? node.value.map((child: TreeNode) => setAllExpanded(child, expanded))
    : node.value;
  return {
    ...node,
    isExpanded: isBranch ? expanded : false,
    value: newChildren,
  };
}

function countNodes(node: TreeNode): { total: number; maxDepth: number } {
  let total = 1;
  let maxDepth = 1;
  if ((node.type === 'Object' || node.type === 'Array') && Array.isArray(node.value)) {
    for (const child of node.value) {
      const childStats = countNodes(child);
      total += childStats.total;
      maxDepth = Math.max(maxDepth, 1 + childStats.maxDepth);
    }
  }
  return { total, maxDepth };
}

interface TreeNodeRowProps {
  node: TreeNode;
  path: number[];
  parentType: DataType | null;
  level: number;
  isDarkMode: boolean;
  filterText: string;
  onUpdateKey: (path: number[], newKey: string) => void;
  onUpdateType: (path: number[], newType: DataType) => void;
  onUpdateValue: (path: number[], newValue: any) => void;
  onAddChild: (path: number[]) => void;
  onDeleteChild: (parentPath: number[], childIdx: number) => void;
  onToggleExpand: (path: number[]) => void;
}

function TreeNodeRow({
  node,
  path,
  parentType,
  level,
  isDarkMode,
  filterText,
  onUpdateKey,
  onUpdateType,
  onUpdateValue,
  onAddChild,
  onDeleteChild,
  onToggleExpand,
}: TreeNodeRowProps) {
  const isBranch = node.type === 'Object' || node.type === 'Array';
  const children = isBranch && Array.isArray(node.value) ? (node.value as TreeNode[]) : [];
  const isArrayChild = parentType === 'Array';

  // Highlight or filter check
  const matchesFilter = useMemo(() => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    const keyMatch = node.key.toLowerCase().includes(q);
    const typeMatch = node.type.toLowerCase().includes(q);
    const valMatch = typeof node.value === 'string' && node.value.toLowerCase().includes(q);
    return keyMatch || typeMatch || valMatch;
  }, [filterText, node.key, node.type, node.value]);

  return (
    <div className={`text-xs transition-colors ${matchesFilter ? 'opacity-100' : 'opacity-40'}`}>
      {/* Current Node Row */}
      <div
        className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg group transition-colors border ${
          level === 0
            ? 'pl-2.5'
            : level === 1
            ? 'pl-5'
            : level === 2
            ? 'pl-10'
            : level === 3
            ? 'pl-14'
            : level === 4
            ? 'pl-20'
            : 'pl-24'
        } ${
          isDarkMode
            ? 'border-transparent hover:border-[#1c3344] hover:bg-[#132733]/60'
            : 'border-transparent hover:border-[#d8e2dc] hover:bg-[#f6f9f7]'
        }`}
      >
        {/* Expand / Collapse Chevron */}
        {isBranch ? (
          <button
            type="button"
            onClick={() => onToggleExpand(path)}
            className={`p-0.5 rounded cursor-pointer shrink-0 transition-colors ${
              isDarkMode
                ? 'text-[#8899a6] hover:text-white hover:bg-[#1c3344]'
                : 'text-[#5c768d] hover:text-[#1c2d38] hover:bg-[#edf2ef]'
            }`}
            title={node.isExpanded ? 'Collapse' : 'Expand'}
          >
            {node.isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-3.5 h-3.5 shrink-0" />
        )}

        {/* Key Editor (or Array Index Badge) */}
        {isArrayChild ? (
          <span
            className={`px-2 py-0.5 rounded font-mono font-semibold text-[11px] shrink-0 border ${
              isDarkMode
                ? 'bg-[#132733] border-[#21313c] text-[#38bdf8]'
                : 'bg-[#edf2ef] border-[#d8e2dc] text-[#0062d2]'
            }`}
          >
            [{node.key}]
          </span>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="text"
              value={node.key}
              onChange={(e) => onUpdateKey(path, e.target.value)}
              placeholder="key"
              className={`px-2 py-1 font-mono font-semibold text-xs rounded border outline-none min-w-[100px] max-w-[170px] ${
                isDarkMode
                  ? 'bg-[#0b1a24] border-[#21313c] text-white focus:border-[#38bdf8]'
                  : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:border-[#00684a]'
              }`}
            />
            <span className={`font-semibold select-none ${isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'}`}>
              :
            </span>
          </div>
        )}

        {/* Data Type Selector at THIS Nth Level */}
        <select
          value={node.type}
          onChange={(e) => onUpdateType(path, e.target.value as DataType)}
          className={`px-2 py-1 text-[11px] font-mono rounded border outline-none cursor-pointer shrink-0 ${
            isDarkMode
              ? 'bg-[#0b1a24] border-[#21313c] text-[#38bdf8] focus:border-[#38bdf8]'
              : 'bg-white border-[#d8e2dc] text-[#00684a] focus:border-[#00684a]'
          }`}
          title="Change data type for this field"
        >
          {DATA_TYPES.map((dt) => (
            <option key={dt.type} value={dt.type}>
              {dt.label}
            </option>
          ))}
        </select>

        {/* Value Editor Component */}
        <div className="flex-1 min-w-0">
          {isBranch ? (
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono font-medium ${
                  isDarkMode ? 'text-[#8899a6]' : 'text-[#5c768d]'
                }`}
              >
                {node.type === 'Array'
                  ? `Array (${children.length} items)`
                  : `Object (${children.length} fields)`}
              </span>
              <button
                type="button"
                onClick={() => onAddChild(path)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#132733] border-[#21313c] text-[#38bdf8] hover:bg-[#1c3344] hover:text-white'
                    : 'bg-[#edf4f0] border-[#d8ece2] text-[#00684a] hover:bg-[#d5ebd9]'
                }`}
                title={node.type === 'Array' ? 'Add item into array' : 'Add field into object'}
              >
                <Plus className="w-3 h-3" />
                <span>{node.type === 'Array' ? 'Add Item' : 'Add Field'}</span>
              </button>
            </div>
          ) : node.type === 'Boolean' ? (
            <select
              value={String(node.value)}
              onChange={(e) => onUpdateValue(path, e.target.value === 'true')}
              className={`px-2 py-1 rounded border font-mono text-xs outline-none cursor-pointer ${
                isDarkMode
                  ? 'bg-[#0b1a24] border-[#21313c] text-[#c084fc] focus:border-[#c084fc]'
                  : 'bg-white border-[#d8e2dc] text-[#7c3aed] focus:border-[#7c3aed]'
              }`}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : node.type === 'Null' ? (
            <span className="italic text-[#8899a6] font-mono">null</span>
          ) : node.type === 'ObjectId' ? (
            <div className="flex items-center gap-1.5 max-w-sm">
              <input
                type="text"
                value={String(node.value ?? '')}
                onChange={(e) => onUpdateValue(path, e.target.value)}
                placeholder="24-hex ObjectId"
                className={`w-full px-2.5 py-1 font-mono text-xs rounded border outline-none ${
                  isDarkMode
                    ? 'bg-[#0b1a24] border-[#21313c] text-[#f87171] focus:border-[#f87171]'
                    : 'bg-white border-[#d8e2dc] text-[#dc2626] focus:border-[#dc2626]'
                }`}
              />
              <button
                type="button"
                onClick={() => onUpdateValue(path, generateObjectId())}
                className={`px-2 py-1 text-[10px] rounded border shrink-0 cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#132733] border-[#21313c] text-[#8899a6] hover:text-white'
                    : 'bg-[#f4f7f5] border-[#d8e2dc] text-[#5c768d] hover:text-[#1c2d38]'
                }`}
                title="Generate new ObjectId"
              >
                Gen
              </button>
            </div>
          ) : node.type === 'Date' ? (
            <div className="flex items-center gap-1.5 max-w-md">
              <input
                type="text"
                value={String(node.value ?? '')}
                onChange={(e) => onUpdateValue(path, e.target.value)}
                placeholder="YYYY-MM-DDTHH:mm:ss.sssZ"
                className={`w-full px-2.5 py-1 font-mono text-xs rounded border outline-none ${
                  isDarkMode
                    ? 'bg-[#0b1a24] border-[#21313c] text-[#fcd34d] focus:border-[#fcd34d]'
                    : 'bg-white border-[#d8e2dc] text-[#d97706] focus:border-[#d97706]'
                }`}
              />
              <button
                type="button"
                onClick={() => onUpdateValue(path, new Date().toISOString())}
                className={`px-2 py-1 text-[10px] rounded border shrink-0 cursor-pointer flex items-center gap-0.5 ${
                  isDarkMode
                    ? 'bg-[#132733] border-[#21313c] text-[#8899a6] hover:text-white'
                    : 'bg-[#f4f7f5] border-[#d8e2dc] text-[#5c768d] hover:text-[#1c2d38]'
                }`}
                title="Set to Current Timestamp"
              >
                <Calendar className="w-2.5 h-2.5" />
                <span>Now</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {node.type === 'String' && (
                <span className={`select-none font-semibold ${isDarkMode ? 'text-white' : 'text-[#5c768d]'}`}>
                  &quot;
                </span>
              )}
              <input
                type={node.type === 'Int32' || node.type === 'Double' ? 'number' : 'text'}
                step={node.type === 'Double' ? '0.01' : '1'}
                value={node.value ?? ''}
                onChange={(e) => onUpdateValue(path, e.target.value)}
                placeholder="value"
                className={`w-full px-2.5 py-1 font-mono text-xs rounded border outline-none ${
                  isDarkMode
                    ? 'bg-[#0b1a24] border-[#21313c] text-white focus:border-[#38bdf8]'
                    : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:border-[#00684a]'
                }`}
              />
              {node.type === 'String' && (
                <span className={`select-none font-semibold ${isDarkMode ? 'text-white' : 'text-[#5c768d]'}`}>
                  &quot;
                </span>
              )}
            </div>
          )}
        </div>

        {/* Delete Row Button */}
        {parentType !== null && (
          <button
            type="button"
            onClick={() => {
              const parentPath = path.slice(0, -1);
              const childIdx = path[path.length - 1];
              onDeleteChild(parentPath, childIdx);
            }}
            className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
              isDarkMode
                ? 'text-[#8899a6] hover:text-red-400 hover:bg-red-950/40'
                : 'text-[#8899a6] hover:text-[#c73e3e] hover:bg-red-50'
            }`}
            title="Delete this field"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Children Container (Recursive Nth Level) */}
      {isBranch && node.isExpanded && (
        <div
          className={`space-y-0.5 border-l-2 ml-4 my-0.5 ${
            isDarkMode ? 'border-[#1c3344]' : 'border-[#d8e2dc]'
          }`}
        >
          {children.length === 0 ? (
            <div
              className={`py-2 px-3 text-[11px] italic rounded my-1 ml-3 ${
                isDarkMode ? 'text-[#8899a6] bg-[#07131d]' : 'text-[#8899a6] bg-[#f8faf9]'
              }`}
            >
              Empty {node.type.toLowerCase()} [{node.type === 'Array' ? ']' : '}'}. Click &quot;Add {node.type === 'Array' ? 'Item' : 'Field'}&quot; above.
            </div>
          ) : (
            children.map((child, idx) => (
              <TreeNodeRow
                key={child.id}
                node={child}
                path={[...path, idx]}
                parentType={node.type}
                level={level + 1}
                isDarkMode={isDarkMode}
                filterText={filterText}
                onUpdateKey={onUpdateKey}
                onUpdateType={onUpdateType}
                onUpdateValue={onUpdateValue}
                onAddChild={onAddChild}
                onDeleteChild={onDeleteChild}
                onToggleExpand={onToggleExpand}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TableFieldEditDialog({
  onClose,
  docId,
  docIndex,
  fieldName,
  initialValue,
  onSave,
  isDarkMode = false,
}: Omit<TableFieldEditModalProps, 'isOpen'>) {
  // Tree state for nth level key value & data type editing
  const [treeRoot, setTreeRoot] = useState<TreeNode>(() => rawToTree(initialValue, fieldName));
  const [isRawJsonMode, setIsRawJsonMode] = useState<boolean>(false);
  const [rawJsonText, setRawJsonText] = useState<string>(() => JSON.stringify(initialValue, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState<string>('');

  const stats = useMemo(() => countNodes(treeRoot), [treeRoot]);

  // Tree action handlers
  const handleUpdateKey = (path: number[], newKey: string) => {
    setTreeRoot((prev) => updateNodeAtPath(prev, path, (node) => ({ ...node, key: newKey })));
  };

  const handleUpdateType = (path: number[], newType: DataType) => {
    setTreeRoot((prev) =>
      updateNodeAtPath(prev, path, (node) => {
        if (newType === 'Object') {
          const defaultChildren = [rawToTree('', 'new_field')];
          return {
            ...node,
            type: 'Object',
            value: defaultChildren,
            isExpanded: true,
          };
        }
        if (newType === 'Array') {
          const defaultChildren = [rawToTree('', '0')];
          return {
            ...node,
            type: 'Array',
            value: defaultChildren,
            isExpanded: true,
          };
        }
        if (newType === 'Boolean') {
          return { ...node, type: 'Boolean', value: true, isExpanded: false };
        }
        if (newType === 'Int32' || newType === 'Double') {
          const num = Number(node.value);
          return { ...node, type: newType, value: isNaN(num) ? 0 : num, isExpanded: false };
        }
        if (newType === 'Null') {
          return { ...node, type: 'Null', value: null, isExpanded: false };
        }
        if (newType === 'Date') {
          return { ...node, type: 'Date', value: new Date().toISOString(), isExpanded: false };
        }
        if (newType === 'ObjectId') {
          return { ...node, type: 'ObjectId', value: generateObjectId(), isExpanded: false };
        }
        return { ...node, type: 'String', value: String(node.value ?? ''), isExpanded: false };
      })
    );
  };

  const handleUpdateValue = (path: number[], newValue: any) => {
    setTreeRoot((prev) => updateNodeAtPath(prev, path, (node) => ({ ...node, value: newValue })));
  };

  const handleAddChild = (path: number[]) => {
    setTreeRoot((prev) => addNodeAtPath(prev, path));
  };

  const handleDeleteChild = (parentPath: number[], childIdx: number) => {
    setTreeRoot((prev) => deleteNodeAtPath(prev, parentPath, childIdx));
  };

  const handleToggleExpand = (path: number[]) => {
    setTreeRoot((prev) =>
      updateNodeAtPath(prev, path, (node) => ({ ...node, isExpanded: !node.isExpanded }))
    );
  };

  const handleExpandAll = () => {
    setTreeRoot((prev) => setAllExpanded(prev, true));
  };

  const handleCollapseAll = () => {
    setTreeRoot((prev) => setAllExpanded(prev, false));
  };

  // Switch between Nth Level Structured Tree & Raw JSON Mode
  const toggleRawJsonMode = () => {
    if (!isRawJsonMode) {
      const rawData = treeToRaw(treeRoot);
      setRawJsonText(JSON.stringify(rawData, null, 2));
      setIsRawJsonMode(true);
      setJsonError(null);
    } else {
      try {
        const parsed = JSON.parse(rawJsonText);
        setTreeRoot(rawToTree(parsed, fieldName));
        setIsRawJsonMode(false);
        setJsonError(null);
      } catch (err: any) {
        setJsonError('Cannot switch to Structured mode: ' + (err.message || 'Invalid JSON syntax'));
      }
    }
  };

  const handleSave = async () => {
    try {
      let finalValue: any;
      if (isRawJsonMode) {
        finalValue = JSON.parse(rawJsonText);
      } else {
        finalValue = treeToRaw(treeRoot);
      }
      await onSave(docId, fieldName, finalValue);
      onClose();
    } catch (err: any) {
      setJsonError(err.message || 'Error parsing value');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4">
      <div
        className={`w-full max-w-3xl rounded-xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isDarkMode
            ? 'bg-[#0b1a24] border-[#1c3344] text-[#e8edeb]'
            : 'bg-white border-[#d8e2dc] text-[#1c2d38]'
        }`}
      >
        {/* MODAL HEADER */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
            isDarkMode ? 'border-[#1c3344] bg-[#07131d]' : 'border-[#e8edeb] bg-[#f9fbfa]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-md border ${
                isDarkMode
                  ? 'bg-[#132733] border-[#21313c] text-white'
                  : 'bg-[#edf2ef] border-[#d8e2dc] text-[#21313c]'
              }`}
            >
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-semibold tracking-wide ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
                  Edit Field: <span className="font-mono text-[#0062d2] dark:text-[#38bdf8]">{fieldName}</span>
                </h3>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                    isDarkMode
                      ? 'bg-[#132733] border-[#21313c] text-[#8899a6]'
                      : 'bg-[#edf2ef] border-[#d8e2dc] text-[#5c768d]'
                  }`}
                >
                  Doc #{docIndex}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                    isDarkMode
                      ? 'bg-[#132733] border-[#21313c] text-[#38bdf8]'
                      : 'bg-[#e8f4ed] border-[#c2e2ce] text-[#00684a]'
                  }`}
                >
                  Nth-Level Editor
                </span>
              </div>
              <p className="text-[11px] text-[#8899a6] mt-0.5 font-mono">
                ObjectId(&apos;{docId}&apos;) · {stats.total} total nodes · {stats.maxDepth} levels deep
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-md cursor-pointer transition-colors ${
              isDarkMode
                ? 'text-[#8899a6] hover:text-white hover:bg-[#132733]'
                : 'text-[#8899a6] hover:text-[#1c2d38] hover:bg-[#edf2ef]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TOOLBAR */}
        <div
          className={`px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 ${
            isDarkMode ? 'border-[#1c3344] bg-[#0b1a24]' : 'border-[#edf2ef] bg-[#fbfcfc]'
          }`}
        >
          {/* Left: Mode Switcher & Expand/Collapse */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1 p-0.5 rounded-md border ${
                isDarkMode ? 'bg-[#07131d] border-[#1c3344]' : 'bg-[#edf2ef] border-[#d8e2dc]'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (isRawJsonMode) toggleRawJsonMode();
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                  !isRawJsonMode
                    ? isDarkMode
                      ? 'bg-[#0062d2] text-white shadow-xs'
                      : 'bg-[#001e2b] text-white shadow-xs'
                    : isDarkMode
                    ? 'text-[#8899a6] hover:text-white'
                    : 'text-[#5c768d] hover:text-[#1c2d38]'
                }`}
              >
                <ListTree className="w-3.5 h-3.5" />
                <span>Nth-Level Tree</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isRawJsonMode) toggleRawJsonMode();
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                  isRawJsonMode
                    ? isDarkMode
                      ? 'bg-[#0062d2] text-white shadow-xs'
                      : 'bg-[#001e2b] text-white shadow-xs'
                    : isDarkMode
                    ? 'text-[#8899a6] hover:text-white'
                    : 'text-[#5c768d] hover:text-[#1c2d38]'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Raw JSON</span>
              </button>
            </div>

            {!isRawJsonMode && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className={`p-1.5 rounded border text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                    isDarkMode
                      ? 'bg-[#132733] border-[#21313c] text-[#8899a6] hover:text-white'
                      : 'bg-white border-[#d8e2dc] text-[#5c768d] hover:text-[#1c2d38]'
                  }`}
                  title="Expand All Nodes"
                >
                  <ChevronsDown className="w-3 h-3" />
                  <span className="hidden sm:inline">Expand All</span>
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className={`p-1.5 rounded border text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                    isDarkMode
                      ? 'bg-[#132733] border-[#21313c] text-[#8899a6] hover:text-white'
                      : 'bg-white border-[#d8e2dc] text-[#5c768d] hover:text-[#1c2d38]'
                  }`}
                  title="Collapse All Nodes"
                >
                  <ChevronsUp className="w-3 h-3" />
                  <span className="hidden sm:inline">Collapse</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Search / Filter Filter */}
          {!isRawJsonMode && (
            <div className="relative">
              <Search className="w-3 h-3 text-[#8899a6] absolute left-2.5 top-2" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter keys or values..."
                className={`pl-7 pr-3 py-1 text-xs rounded-md border outline-none w-44 focus:w-56 transition-all ${
                  isDarkMode
                    ? 'bg-[#07131d] border-[#1c3344] text-white focus:border-[#38bdf8]'
                    : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:border-[#00684a]'
                }`}
              />
              {filterText && (
                <button
                  type="button"
                  onClick={() => setFilterText('')}
                  className="absolute right-2 top-1.5 text-[#8899a6] hover:text-white text-[11px]"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* ERROR NOTIFICATION */}
        {jsonError && (
          <div className="px-6 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{jsonError}</span>
          </div>
        )}

        {/* MAIN BODY */}
        <div className="p-6 flex-1 overflow-y-auto min-h-0">
          {isRawJsonMode ? (
            /* RAW JSON EDITOR MODE */
            <div className="space-y-2 h-full flex flex-col">
              <div className="flex items-center justify-between text-xs text-[#8899a6]">
                <span>Edit as raw JSON (syntax validated on save):</span>
                <span>{rawJsonText.split('\n').length} lines</span>
              </div>
              <textarea
                value={rawJsonText}
                onChange={(e) => {
                  setRawJsonText(e.target.value);
                  setJsonError(null);
                }}
                rows={16}
                spellCheck={false}
                className={`w-full p-3 font-mono text-xs rounded-lg border outline-none leading-relaxed flex-1 resize-y ${
                  isDarkMode
                    ? 'bg-[#07131d] border-[#1c3344] text-white focus:ring-1 focus:ring-[#38bdf8]'
                    : 'bg-[#fcfdfd] border-[#d8e2dc] text-[#1c2d38] focus:ring-1 focus:ring-[#001e2b]'
                }`}
              />
            </div>
          ) : (
            /* STRUCTURED NTH-LEVEL TREE EDITOR */
            <div className="space-y-2">
              {/* Root Node Controls & Breadcrumb Guide */}
              <div
                className={`p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3 ${
                  isDarkMode
                    ? 'bg-[#07131d] border-[#1c3344]'
                    : 'bg-[#f8faf9] border-[#e8edeb]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-xs ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
                    Root Field Type:
                  </span>
                  <select
                    value={treeRoot.type}
                    onChange={(e) => handleUpdateType([], e.target.value as DataType)}
                    className={`px-2.5 py-1 text-xs font-mono font-semibold rounded border outline-none cursor-pointer ${
                      isDarkMode
                        ? 'bg-[#132733] border-[#21313c] text-[#38bdf8] focus:border-[#38bdf8]'
                        : 'bg-white border-[#d8e2dc] text-[#00684a] focus:border-[#00684a]'
                    }`}
                  >
                    {DATA_TYPES.map((dt) => (
                      <option key={dt.type} value={dt.type}>
                        {dt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {(treeRoot.type === 'Object' || treeRoot.type === 'Array') && (
                  <button
                    type="button"
                    onClick={() => handleAddChild([])}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold shadow-xs cursor-pointer transition-colors ${
                      isDarkMode
                        ? 'bg-[#0062d2] hover:bg-[#0051b3] text-white'
                        : 'bg-[#001e2b] hover:bg-[#112734] text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add {treeRoot.type === 'Array' ? 'Root Item' : 'Root Field'}</span>
                  </button>
                )}
              </div>

              {/* Nth Level Recursive Tree Render */}
              <div
                className={`p-3 rounded-lg border overflow-x-auto min-h-[220px] ${
                  isDarkMode
                    ? 'bg-[#07131d]/60 border-[#1c3344]'
                    : 'bg-white border-[#e8edeb]'
                }`}
              >
                {treeRoot.type === 'Object' || treeRoot.type === 'Array' ? (
                  Array.isArray(treeRoot.value) && treeRoot.value.length === 0 ? (
                    <div
                      className={`p-8 text-center text-xs rounded-lg border border-dashed ${
                        isDarkMode
                          ? 'border-[#1c3344] text-[#8899a6] bg-[#0b1a24]/50'
                          : 'border-[#d8e2dc] text-[#8899a6] bg-[#f9fbfa]'
                      }`}
                    >
                      <p>
                        Empty {treeRoot.type.toLowerCase()} {treeRoot.type === 'Array' ? '[]' : '{}'}.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleAddChild([])}
                        className="mt-3 px-3 py-1 text-xs font-medium rounded bg-[#0062d2] text-white cursor-pointer"
                      >
                        Add First {treeRoot.type === 'Array' ? 'Item' : 'Field'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {(treeRoot.value as TreeNode[]).map((child, idx) => (
                        <TreeNodeRow
                          key={child.id}
                          node={child}
                          path={[idx]}
                          parentType={treeRoot.type}
                          level={0}
                          isDarkMode={isDarkMode}
                          filterText={filterText}
                          onUpdateKey={handleUpdateKey}
                          onUpdateType={handleUpdateType}
                          onUpdateValue={handleUpdateValue}
                          onAddChild={handleAddChild}
                          onDeleteChild={handleDeleteChild}
                          onToggleExpand={handleToggleExpand}
                        />
                      ))}
                    </div>
                  )
                ) : (
                  /* Primitive Root Value Editor */
                  <div className="p-4 space-y-3">
                    <label className={`block text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
                      Primitive Value:
                    </label>
                    {treeRoot.type === 'Boolean' ? (
                      <select
                        value={String(treeRoot.value)}
                        onChange={(e) => handleUpdateValue([], e.target.value === 'true')}
                        className={`px-3 py-1.5 text-xs rounded border font-mono ${
                          isDarkMode
                            ? 'bg-[#0b1a24] border-[#21313c] text-[#c084fc]'
                            : 'bg-white border-[#d8e2dc] text-[#7c3aed]'
                        }`}
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : treeRoot.type === 'Null' ? (
                      <span className="italic text-[#8899a6] font-mono text-sm">null</span>
                    ) : (
                      <input
                        type={treeRoot.type === 'Int32' || treeRoot.type === 'Double' ? 'number' : 'text'}
                        value={treeRoot.value ?? ''}
                        onChange={(e) => handleUpdateValue([], e.target.value)}
                        className={`w-full max-w-md px-3 py-1.5 text-xs font-mono rounded border outline-none ${
                          isDarkMode
                            ? 'bg-[#0b1a24] border-[#21313c] text-white focus:border-[#38bdf8]'
                            : 'bg-white border-[#d8e2dc] text-[#1c2d38] focus:border-[#00684a]'
                        }`}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div
          className={`flex items-center justify-between px-6 py-3.5 border-t shrink-0 ${
            isDarkMode ? 'border-[#1c3344] bg-[#07131d]' : 'border-[#e8edeb] bg-[#f9fbfa]'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-[#8899a6]">
            <span>
              Target: <strong className={isDarkMode ? 'text-white' : 'text-[#1c2d38]'}>{fieldName}</strong>
            </span>
            <span>·</span>
            <span>Type: <strong className="font-mono text-[#0062d2] dark:text-[#38bdf8]">{treeRoot.type}</strong></span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                isDarkMode
                  ? 'bg-[#132733] border-[#21313c] text-[#8899a6] hover:text-white'
                  : 'bg-white border-[#d8e2dc] text-[#5c768d] hover:text-[#1c2d38]'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md shadow-xs cursor-pointer transition-colors ${
                isDarkMode
                  ? 'bg-[#0062d2] hover:bg-[#0051b3] text-white'
                  : 'bg-[#001e2b] hover:bg-[#112734] text-white'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save &amp; Update Document</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableFieldEditModal({
  isOpen,
  onClose,
  docId,
  docIndex,
  fieldName,
  initialValue,
  onSave,
  isDarkMode = false,
}: TableFieldEditModalProps) {
  if (!isOpen) return null;

  return (
    <TableFieldEditDialog
      key={`${docId}-${fieldName}-${JSON.stringify(initialValue)?.length || 0}`}
      onClose={onClose}
      docId={docId}
      docIndex={docIndex}
      fieldName={fieldName}
      initialValue={initialValue}
      onSave={onSave}
      isDarkMode={isDarkMode}
    />
  );
}
