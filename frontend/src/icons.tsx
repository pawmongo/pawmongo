import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { config, type IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faArrowDown, faArrowLeft, faArrowRight, faArrowUp, faArrowUpRightFromSquare, faBookOpen, faChevronDown, faChevronRight, faCircleQuestion, faCode, faDatabase, faFileCode, faFolderOpen, faLayerGroup, faSpinner, faLock, faRightFromBracket, faBars, faPen, faTrashCan, faPlus, faArrowsRotate, faMagnifyingGlass, faShieldHalved, faSliders, faPlugCircleXmark, faXmark, faSort, faPlug, faPeopleGroup, faFileLines, faFilter, faCheck, faMinus, faSun, faMoon, faChartSimple, faClockRotateLeft, faWandMagicSparkles, faList, faTableCells } from '@fortawesome/free-solid-svg-icons';

config.autoAddCss = false;

type IconProps = { size?: number; className?: string };
function createIcon(definition: IconDefinition) {
  return function AppIcon({ size = 16, className }: IconProps) {
    return <FontAwesomeIcon icon={definition} className={className} style={{ width: size, height: size }} aria-hidden="true"/>;
  };
}
export const ArrowDown = createIcon(faArrowDown);
export const ArrowLeft = createIcon(faArrowLeft);
export const ArrowRight = createIcon(faArrowRight);
export const ArrowUp = createIcon(faArrowUp);
export const ArrowUpRight = createIcon(faArrowUpRightFromSquare);
export const BookOpen = createIcon(faBookOpen);
export const ChevronDown = createIcon(faChevronDown);
export const ChevronRight = createIcon(faChevronRight);
export const CircleHelp = createIcon(faCircleQuestion);
export const Code2 = createIcon(faCode);
export const Database = createIcon(faDatabase);
export const FileJson = createIcon(faFileCode);
export const FolderOpen = createIcon(faFolderOpen);
export const Layers3 = createIcon(faLayerGroup);
export const LoaderCircle = createIcon(faSpinner);
export const LockKeyhole = createIcon(faLock);
export const LogOut = createIcon(faRightFromBracket);
export const Menu = createIcon(faBars);
export const Pencil = createIcon(faPen);
export const Trash2 = createIcon(faTrashCan);
export const Plus = createIcon(faPlus);
export const RefreshCw = createIcon(faArrowsRotate);
export const Search = createIcon(faMagnifyingGlass);
export const ShieldCheck = createIcon(faShieldHalved);
export const SlidersHorizontal = createIcon(faSliders);
export const Unplug = createIcon(faPlugCircleXmark);
export const X = createIcon(faXmark);
export const Check = createIcon(faCheck);
export const Sun = createIcon(faSun);
export const Moon = createIcon(faMoon);
export const Sort = createIcon(faSort);

const sectionIcons = { database: faDatabase, collection: faLayerGroup, lock: faLock, connect: faPlug, community: faPeopleGroup, document: faFileLines };
export function SectionIcon({ name, className = '' }: { name: keyof typeof sectionIcons; className?: string }) {
  return <FontAwesomeIcon icon={sectionIcons[name]} className={`color-icon ${className}`} aria-hidden="true"/>;
}


export const Chart = createIcon(faChartSimple);
export const History = createIcon(faClockRotateLeft);
export const Sparkles = createIcon(faWandMagicSparkles);
export const List = createIcon(faList);
export const Table = createIcon(faTableCells);
