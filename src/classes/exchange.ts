import type {
  ExchangeType,
  AdapterType,
  EventSubscriberType,
  ExchangePolicyType,
} from "../types"
import { EventEmitter } from "eventemitter3"

export abstract class Exchange<S extends object, T extends object> implements ExchangeType {
  protected sourceAdapter: AdapterType<S>
  protected targetAdapter: AdapterType<T>

  protected sourceData = new Map<string, S>()
  protected targetData = new Map<string, T>()

  protected policy: ExchangePolicyType = {
    create: "info",
    update: "info",
    delete: "info",
  }

  protected emitter: EventEmitter

  constructor(sourceAdapter: AdapterType<S>, targetAdapter: AdapterType<T>) {
    this.sourceAdapter = sourceAdapter
    this.targetAdapter = targetAdapter
    this.emitter = new EventEmitter()
  }

  abstract getSourceKey(data: S): string
  abstract getTargetKey(data: T): string
  abstract getUpdateData(source: S, target: T): Partial<T> | false
  abstract convertSourceToTarget(source: S): T

  setPolicy(policy: Partial<ExchangePolicyType>): this {
    this.policy = { ...this.policy, ...policy }
    return this
  }

  async run(): Promise<void> {
    this.emitter.emit("runBefore")

    const sourcePromise = this.sourceAdapter.read().then((data) => {
      this.putTo(this.sourceData, data, this.getSourceKey.bind(this))
      this.emitter.emit("sourceDataReady")
    })

    const targetPromise = this.targetAdapter.read().then((data) => {
      this.putTo(this.targetData, data, this.getTargetKey.bind(this))
      this.emitter.emit("targetDataReady")
    })

    await Promise.all([sourcePromise, targetPromise])

    this.sourceData.forEach(async (sourceItem, key) => {
      let targetItem = this.targetData.get(key)

      if (!targetItem) {
        if (this.policy.create === "do") {
          await this.targetAdapter.create(this.convertSourceToTarget(sourceItem))
          this.emitter.emit("itemCreated", sourceItem)
        } else if (this.policy.create === "info") {
          console.info(`Item with key "${key}" will be created.`)
        }
        return
      }

      const updateData = this.getUpdateData(sourceItem, targetItem)

      if (updateData) {
        if (this.policy.update === "do") {
          await this.targetAdapter.update(updateData)
          this.emitter.emit("itemUpdated", updateData)
        } else if (this.policy.update === "info") {
          console.info(
            `Item with key "${key}" will be updated with data:`,
            updateData,
          )
        }
      } else {
        console.log(
          `Skip condition met for item with key "${key}". No update needed.`,
        )
      }
    })

    this.targetData.forEach(async (targetItem, key) => {
      if (!this.sourceData.has(key)) {
        if (this.policy.delete === "do") {
          await this.targetAdapter.delete(targetItem)
          this.emitter.emit("itemDeleted", targetItem)
        } else if (this.policy.delete === "info") {
          console.info(`Item with key "${key}" will be deleted.`)
        }
      }
    })

    this.emitter.emit("runAfter")
  }

  subscribe(subscriber: Partial<EventSubscriberType<S, T>>): () => void {
    for (const event in subscriber) {
      if (subscriber[event as keyof EventSubscriberType<S, T>]) {
        this.emitter.on(
          event,
          subscriber[event as keyof EventSubscriberType<S, T>] as any,
        )
      }
    }

    return () => {
      for (const event in subscriber) {
        if (subscriber[event as keyof EventSubscriberType<S, T>]) {
          this.emitter.off(
            event,
            subscriber[event as keyof EventSubscriberType<S, T>] as any,
          )
        }
      }
    }
  }

  protected putTo<U extends object>(target: Map<string, U>, data: U[], getKey: (data: U) => string): void {
    data.forEach((item) => {
      const key = getKey(item)

      if (target.has(key)) {
        throw new Error(`Duplicate key "${key}" found in data.`)
      }

      target.set(key, item)
    })
  }
}
