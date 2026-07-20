const memoryStore = new Map();

function collectionRef(db) {
  return db?.collection ? db.collection("customerTwins") : null;
}

export class CustomerTwinRepository {
  constructor(db = null) {
    this.db = db;
  }

  async get(customerId) {
    const collection = collectionRef(this.db);
    if (!collection) return memoryStore.get(customerId) || null;
    const snapshot = await collection.doc(customerId).get();
    return snapshot.exists ? snapshot.data() : null;
  }

  async save(twin) {
    const collection = collectionRef(this.db);
    if (!collection) {
      memoryStore.set(twin.id, structuredClone(twin));
      return twin;
    }
    await collection.doc(twin.id).set(twin, { merge: false });
    return twin;
  }

  async appendEvent(customerId, event) {
    const collection = collectionRef(this.db);
    if (!collection) return event;
    await collection.doc(customerId).collection("timeline").doc(event.id).set(event);
    return event;
  }

  async history(customerId, limit = 100) {
    const collection = collectionRef(this.db);
    if (!collection) return [];
    const snapshot = await collection
      .doc(customerId)
      .collection("timeline")
      .orderBy("recordedAt", "desc")
      .limit(Math.max(1, Math.min(500, Number(limit) || 100)))
      .get();
    return snapshot.docs.map((doc) => doc.data());
  }
}
