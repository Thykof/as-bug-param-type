interface Serializable {
  serialize(): StaticArray<u8>;
}

export function addAnything<T>(arg: T): void {
  if (arg[0] instanceof Serializable) {
    serializableObjectArrayToBytes(arg);
  }
}

function serializableObjectArrayToBytes<T extends Serializable>(
  source: T[],
): StaticArray<u8> {
  log('in serializableObjectArrayToBytes');

  // comment this line to see that at runtime we don't pass into this function
  source[0].serialize();

  return [];
}
