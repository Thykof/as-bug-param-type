// ---------------------------------------------------------------------------------------------------------------------
interface Serializable {
  serialize(): StaticArray<u8>;
  deserialize(data: StaticArray<u8>, offset: i32): i32;
}
// ---------------------------------------------------------------------------------------------------------------------

let serialized = new StaticArray<u8>(0);
let offset: i32 = 0;

function getNextData(size: i32): StaticArray<u8> {
  return changetype<StaticArray<u8>>(
    serialized.slice(offset, offset + size).dataStart,
  );
}

function nextU32(): u32 {
  const size: i32 = sizeof<u32>();

  const value = bytesToU32(getNextData(size));
  offset += size;
  return value;
}

export function nextArray<T>(): T[] {
  const length = nextU32();

  const amount = length;

  if (amount === 0) {
    return [];
  }

  const bufferSize = amount << alignof<T>();
  const value = bytesToArray<T>(getNextData(bufferSize));
  offset += bufferSize;
  return value;
}

function nextSerializableArray<T extends Serializable>(): T[] {
  return bytesToSerializableObjectArray<T>(serialized);
}

export function addAnything<T>(arg: T): void {
  if (isArray<T>() && arg.length && arg[0] instanceof Serializable) {
    addSerializableObjectArray(arg);
  } else if (isArray<T>()) {
    log('51');
    addArray(arg);
  } else if (arg instanceof u32 || arg instanceof i32) {
    serialized = serialized.concat(u32ToBytes(arg as u32));
  } else {
    ERROR("args doesn't know how to serialize the given type.");
  }
}

export function addArray<T>(arg: T[]): void {
  const array = arg as Array<T>;
  addAnything(array.length);
  serialized = serialized.concat(arrayToBytes<T>(array));
}

function addSerializableObjectArray<T extends Serializable>(arg: T[]): void {
  serialized = serialized.concat(serializableObjectArrayToBytes<T>(arg));
}

// ---------------------------------------------------------------------------------------------------------------------

function fromBytes<T>(arr: StaticArray<u8>): T {
  if (!isInteger<T>()) {
    ERROR('output must be a integer');
  }
  return load<T>(changetype<usize>(arr), 0);
}

function toBytes<T>(val: T): StaticArray<u8> {
  if (!isInteger<T>()) {
    ERROR('input must be a integer');
  }
  const arr = new StaticArray<u8>(sizeof<T>());
  store<T>(changetype<usize>(arr), val);
  return arr;
}

function bytesToU32(arr: StaticArray<u8>): u32 {
  return fromBytes<u32>(arr);
}

function u32ToBytes(val: u32): StaticArray<u8> {
  return toBytes(val);
}

// ---------------------------------------------------------------------------------------------------------------------

/**
 * Convert an array of type parameter to StaticArray<u8>
 *
 * @remarks
 * This do not a deep copy.
 * inspired by https://github.com/AssemblyScript/assemblyscript/blob/main/std/assembly/array.ts#L69-L81
 *
 * @param source - the array to convert
 * @returns
 */
function arrayToBytes<T>(source: T[]): StaticArray<u8> {
  const sourceLength = source.length;

  // ensures that the new array has the proper length.
  // u16 are encoded using 4 bytes, u64 uses 8
  // hence we need to multiple by 2 (swap bit) the right number of time (alignof<T>)
  let targetLength = (<usize>sourceLength) << alignof<T>();

  // allocates a new StaticArray<u8> in the memory
  let target = changetype<StaticArray<u8>>(
    // @ts-ignore: Cannot find name '__new'
    __new(targetLength, idof<StaticArray<u8>>()),
  );

  // copies the content of the source buffer to the newly allocated array.
  // Note: the pointer to the data buffer for Typed Array is in dataStart.
  // There is no such things for StaticArray.
  memory.copy(changetype<usize>(target), source.dataStart, targetLength);

  return target;
}

/**
 * Converts a StaticArray<u8> into a Array of type parameter.
 *
 * @remarks
 * This do not a deep copy.
 * inspired by https://github.com/AssemblyScript/assemblyscript/blob/main/std/assembly/array.ts#L69-L81
 *
 * @param source - the array to convert
 */
function bytesToArray<T>(source: StaticArray<u8>): T[] {
  let bufferSize = source.length;
  const array = instantiate<T[]>(bufferSize >> alignof<T>());
  memory.copy(array.dataStart, changetype<usize>(source), bufferSize);

  return array;
}

// ---------------------------------------------------------------------------------------------------------------------

function serializableObjectArrayToBytes<T extends Serializable>(
  source: T[],
): StaticArray<u8> {
  let array = new StaticArray<u8>(0);

  for (let index = 0; index < source.length; index++) {
    const element = source[index];
    array = array.concat(element.serialize());
  }

  return array;
}

function bytesToSerializableObjectArray<T extends Serializable>(
  source: StaticArray<u8>,
): T[] {
  const array = instantiate<T[]>(0);

  let offset = 0;

  while (offset < source.length) {
    const object = instantiate<T>();
    const result = object.deserialize(source, offset);
    offset = result;
    array.push(object);
  }

  return array;
}
