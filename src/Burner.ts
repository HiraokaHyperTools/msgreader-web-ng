import { TypeEnum } from "./Reader.js";
import CONST from "./const.js";
import { encodeUCS2String } from "./utils.js";

/**
 * CFBF entry for CFBF burner.
 * 
 * These entries are stored in same order in CFBF.
 * 
 * The first entry must be {@link TypeEnum#ROOT}.
 * 
 * This {@link TypeEnum#ROOT} stream represents:
 * 
 * - The root folder as same as you see in real file system.
 *   Including direct children files/folder.
 * - The body of minifat.
 * 
 * The secondary entries are collection of items having type either {@link TypeEnum#DIRECTORY} or {@link TypeEnum#DOCUMENT}.
 * 
 */
export interface Entry {
    /**
     * Entry name (max 32 chars).
     */
    name: string;

    /**
     * Entry type:
     * 
     * - {@link TypeEnum#DIRECTORY}
     * - {@link TypeEnum#DOCUMENT}
     * - {@link TypeEnum#ROOT}
     */
    type: TypeEnum;

    /**
     * Callback to supply binary data.
     *
     * This is valid only for {@link TypeEnum#DOCUMENT} entry type.
    */
    binaryProvider?: () => ArrayLike<number>;

    /**
     * Binary data length in byte unit.
     * 
     * Has to match with {@link binaryProvider}'s length.
     * 
     * This is valid only for {@link TypeEnum#DOCUMENT} entry type. Otherwise set zero.
     */
    length: number;

    /**
     * The indices to sub entries including {@link TypeEnum#DOCUMENT} and {@link TypeEnum#DIRECTORY}.
     * 
     * This is valid only for {@link TypeEnum#DIRECTORY} entry type.
     */
    children?: number[];
}

interface LiteEntry {
    entry: Entry;

    /**
     * Lesser side of {@link Entry.name}
     */
    left: number;

    /**
     * Greater side of {@link Entry.name}
     */
    right: number;

    child: number;

    firstSector: number;
    isMini?: boolean;

    isRed: boolean;
}

function RoundUpto4096(num: number) {
    return (num + 4095) & (~4095);
}

function RoundUpto512(bytes: number) {
    return (bytes + 511) & (~511);
}

function RoundUpto64(bytes: number) {
    return (bytes + 63) & (~63);
}

function repeatValue(value: number, count: number): number[] {
    const array = [];
    for (let x = 0; x < count; x++) {
        array.push(value);
    }
    return array;
}

class LiteFat {
    sectors: number[];

    constructor(source) {
        this.sectors = source;
    }

    allocate(count: number): number {
        const first = this.sectors.length;
        for (let x = 0; x < count; x++) {
            const next = (x + 1 === count) ? -2 : first + x + 1;
            this.sectors.push(next);
        }
        return first;
    }

    allocateAs(count: number, value: number): number {
        const first = this.sectors.length;
        for (let x = 0; x < count; x++) {
            this.sectors.push(value);
        }
        return first;
    }

    finalize(boundary: number, value: number): this {
        let num = (boundary - (this.sectors.length % boundary)) % boundary;
        for (; num >= 1; num -= 1) {
            this.sectors.push(value);
        }
        return this;
    }

    count(): number {
        return this.sectors.length;
    }
}

class LiteBurner {
    liteEnts: LiteEntry[];
    fat: LiteFat;
    miniFat: LiteFat;
    array: ArrayBuffer;

    constructor(entries: Entry[]) {
        this.fat = new LiteFat([]);
        this.miniFat = new LiteFat([]);

        this.liteEnts = entries
            .map(
                it => ({
                    entry: it,
                    left: -1,
                    right: -1,
                    child: -1,
                    firstSector: 0,
                    isMini: it.length < 4096,
                    isRed: false,
                })
            );

        this.buildTree(0);


        const entriesFirstSector = this.fat.allocate(RoundUpto512(128 * this.liteEnts.length) / 512);

        for (let liteEnt of this.liteEnts
            .filter(it => true
                && it.entry.type == TypeEnum.DOCUMENT
                && it.isMini === false
            )
        ) {
            liteEnt.firstSector = (liteEnt.entry.length === 0)
                ? -2
                : this.fat.allocate(RoundUpto512(liteEnt.entry.length) / 512);
        }

        for (let liteEnt of this.liteEnts
            .filter(it => true
                && it.entry.type == TypeEnum.DOCUMENT
                && it.isMini === true
            )
        ) {
            liteEnt.firstSector = (liteEnt.entry.length === 0)
                ? -2
                : this.miniFat.allocate(RoundUpto64(liteEnt.entry.length) / 64);
        }

        const numMiniFatSectors = RoundUpto512(4 * this.miniFat.count()) / 512;
        const firstMiniFatSector = (numMiniFatSectors !== 0)
            ? this.fat.allocate(numMiniFatSectors)
            : -2;

        const bytesMiniFat = 64 * this.miniFat.count();

        const firstMiniDataSector = this.fat.allocate(RoundUpto512(bytesMiniFat) / 512);

        this.liteEnts[0].firstSector = firstMiniDataSector;

        const firstFatSector = this.fat.allocateAs(RoundUpto512(4 * (this.fat.count() + this.fat.count() / 128 + this.fat.count() / (128 * 109))) / 512, -3);
        const numFatSectors = this.fat.count() - firstFatSector;

        const numDifatSectors = (numFatSectors > 109)
            ? RoundUpto512(4 * Math.floor((numFatSectors - 109) / 127 * 128)) / 512
            : 0;

        const firstDifatSector = (numDifatSectors !== 0)
            ? this.fat.allocateAs(numDifatSectors, -4)
            : -2;

        const ab = new ArrayBuffer(512 * (1 + this.fat.count()));
        const array = new Uint8Array(ab);
        const view = new DataView(ab);

        this.miniFat.finalize(512 / 4, -1);

        const difat1 = [];
        const difat2 = [];

        {
            let x = 0;
            for (; x < 109 && x < numFatSectors; x++) {
                difat1.push(firstFatSector + x);
            }
            let nextDifatSector = firstDifatSector + 1;
            for (; x < numFatSectors; x++) {
                difat2.push(firstFatSector + x);

                const remain = (difat2.length & 127);
                if (remain === 127) {
                    difat2.push(nextDifatSector);
                    nextDifatSector++;
                }
            }

            while (true) {
                const remain = (difat2.length & 127);
                if (remain === 0) {
                    break;
                }
                difat2.push((remain === 127) ? -2 : -1);
            }
        }

        // header

        {
            writeUint8Array(view, 0, CONST.FILE_HEADER);
            view.setUint16(0x18, 0x3E, true); //ushort MinorVersion
            view.setUint16(0x1A, 0x03, true); //ushort MajorVersion
            view.setUint16(0x1C, 0xFFFE, true); //ushort ByteOrder
            view.setUint16(0x1E, 9, true); //ushort SectorShift
            view.setUint16(0x20, 6, true); //ushort MiniSectorShift

            view.setInt32(0x2C, numFatSectors, true); //int32 NumberOfFATSectors
            view.setInt32(0x30, entriesFirstSector, true); //int32 FirstDirectorySectorLocation

            view.setInt32(0x38, 4096, true); //int32 MiniStreamCutoffSize
            view.setInt32(0x3C, firstMiniFatSector, true); //int32 FirstMiniFATSectorLocation
            view.setInt32(0x40, numMiniFatSectors, true); //int32 NumberOfMiniFATSectors
            view.setInt32(0x44, firstDifatSector, true); //int32 FirstDIFATSectorLocation
            view.setInt32(0x48, numDifatSectors, true); //int32 NumberOfDIFATSectors

            let x = 0;
            for (; x < difat1.length; x++) {
                view.setInt32(0x4C + 4 * x, difat1[x], true); //int32 DIFAT[x]
            }
            for (; x < 109; x++) {
                view.setInt32(0x4C + 4 * x, -1, true); //int32 DIFAT[x]
            }
        }

        // entries

        for (let x = 0; x < this.liteEnts.length; x++) {
            const liteEnt = this.liteEnts[x];
            const pos = 512 * (1 + entriesFirstSector) + 128 * x;

            const entryName = encodeUCS2String(liteEnt.entry.name);
            writeUint8Array(view, pos, entryName);
            const numBytesName = entryName.length;

            view.setUint16(pos + 0x40, Math.min(64, numBytesName + 2), true);
            view.setUint8(pos + 0x42, liteEnt.entry.type);
            view.setUint8(pos + 0x43, liteEnt.isRed ? 0 : 1);
            view.setInt32(pos + 0x44, liteEnt.left, true);
            view.setInt32(pos + 0x48, liteEnt.right, true);
            view.setInt32(pos + 0x4C, liteEnt.child, true);

            if (x === 0) {
                writeUint8Array(view, pos + 0x50, [0x0B, 0x0D, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46]);
            }

            const length = (x === 0)
                ? bytesMiniFat
                : liteEnt.entry.length;
            const firstSector = (length !== 0)
                ? liteEnt.firstSector
                : (liteEnt.entry.type === TypeEnum.DIRECTORY ? 0 : -2);

            view.setInt32(pos + 0x74, firstSector, true);
            view.setInt32(pos + 0x78, length, true);
        }

        for (let liteEnt of this.liteEnts
            .filter(it => true
                && it.entry.type == TypeEnum.DOCUMENT
                && it.isMini === false
            )
        ) {
            const bytes = liteEnt.entry.binaryProvider();
            array.set(bytes, 512 * (1 + liteEnt.firstSector));
        }

        for (let liteEnt of this.liteEnts
            .filter(it => true
                && it.entry.type == TypeEnum.DOCUMENT
                && it.isMini === true
            )
        ) {
            const bytes = liteEnt.entry.binaryProvider();
            array.set(bytes, 512 * (1 + firstMiniDataSector) + 64 * liteEnt.firstSector);
        }

        // minifat

        writeInt32Array(view, 512 * (1 + firstMiniFatSector), this.miniFat.sectors);

        // fat

        this.fat.finalize(512 / 4, -1);

        writeInt32Array(view, 512 * (1 + firstFatSector), this.fat.sectors);

        // difat

        if (numDifatSectors >= 1) {
            writeInt32Array(view, 512 * (1 + firstDifatSector), difat2);
        }

        this.array = ab;
    }

    /**
     * CFBF dedicated name comparer
     * 
     * - At first compare UTF-16 length.
     * - Then compare upper cased UTF-16 string.
     */
    private compareName(a: string, b: string): number {
        let t = a.length - b.length;
        if (t === 0) {
            const x = a.toUpperCase();
            const y = b.toUpperCase();
            if (x > y) {
                t = 1;
            }
            else if (x < y) {
                t = -1;
            }
        }
        return t;
    }

    /**
     * Build the directory tree.
     * 
     * @param dirIndex The index of the directory entry to be built.
     */
    private buildTree(dirIndex: number) {
        const { liteEnts } = this;
        const liteEntry = liteEnts[dirIndex];

        if (liteEntry.entry.type === TypeEnum.DOCUMENT) {
            throw new Error("It must be a storage!");
        }

        // Array.sort is destructive, so copy it by concat() before changing
        const children = liteEntry.entry.children.concat();
        if (1 <= children.length) {
            children.sort(
                (a, b) => {
                    return this.compareName(
                        liteEnts[a].entry.name,
                        liteEnts[b].entry.name
                    );
                }
            );

            // (     | 0   )
            // (   0 | 1   )
            // (   0 | 1 2 )

            // (left, right), returns first right node
            const split2 = (start: number, end: number, isRed: boolean): number => {
                if (start < end) {
                    const midNum = Math.floor((start + end) / 2);
                    const entryIndex = children[midNum];
                    const entry = liteEnts[entryIndex];
                    entry.isRed = isRed;
                    entry.left = split2(start, midNum, !isRed);
                    entry.right = split2(midNum + 1, end, !isRed);
                    return entryIndex;
                } else {
                    return -1;
                }
            }

            // (     | 0 |     )
            // (     | 0 | 1   )
            // (   0 | 1 | 2   )
            // (   0 | 1 | 2 3 )
            // ( 0 1 | 2 | 3 4 )

            // (left, root, right), returns root node
            const split3 = (): number => {
                const midNum = Math.floor(children.length / 2);
                const entryIndex = children[midNum];
                const entry = liteEnts[entryIndex];
                entry.isRed = false;
                entry.left = split2(0, midNum, true);
                entry.right = split2(midNum + 1, children.length, true);
                return entryIndex;
            };

            liteEntry.child = split3();

            for (let subIndex of children
                .filter(it => liteEnts[it].entry.type === TypeEnum.DIRECTORY)
            ) {
                this.buildTree(subIndex);
            }
        }
    }
}

function writeInt32Array(dataView: DataView, offset: number, array: ArrayLike<number>) {
    for (let x = 0; x < array.length; x++) {
        dataView.setInt32(offset + x * 4, array[x], true);
    }
}

function writeUint8Array(dataView: DataView, offset: number, array: ArrayLike<number>) {
    for (let x = 0; x < array.length; x++) {
        dataView.setUint8(offset + x, array[x]);
    }
}

/**
 * Burn CFBF file on the fly.
 * 
 * CFBF = Compound File Binary Format
 * 
 * @param entries The flattened (not tree) entries starting with `Root Entry`.
 * @returns The binary.
 */
export function burn(entries: Entry[]): Uint8Array {
    return new Uint8Array(new LiteBurner(entries).array);
}
