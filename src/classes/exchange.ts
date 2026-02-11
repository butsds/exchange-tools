import type {
  ExchangeType,
  AdapterType,
  EventSubscriberType,
  ExchangePolicyType,
  ConverterType,
} from "../types"
import { EventEmitter } from "eventemitter3"

export abstract class Exchange<T extends object> implements ExchangeType {
  protected sourceAdapter: AdapterType<T>
  protected targetAdapter: AdapterType<T>
  protected converter: ConverterType<T>

  protected sourceData = new Map<string, T>()
  protected targetData = new Map<string, T>()

  protected policy: ExchangePolicyType = {
    create: "info",
    update: "info",
    delete: "info",
  }

  protected emitter: EventEmitter

  constructor(sourceAdapter: AdapterType<T>, targetAdapter: AdapterType<T>) {
    this.sourceAdapter = sourceAdapter
    this.targetAdapter = targetAdapter
    this.converter = (data) => data
    this.emitter = new EventEmitter()
  }

  abstract getCommonKey(data: T): string
  abstract compare(source: T, target: T): boolean
  abstract getUpdateData(source: T, target: T): Partial<T> | false

  setPolicy(policy: Partial<ExchangePolicyType>): this {
    this.policy = { ...this.policy, ...policy }
    return this
  }

  setConverter(converter: ConverterType<T>): this {
    this.converter = converter
    return this
  }

  async run(): Promise<void> {
    this.emitter.emit("runBefore")

    const sourcePromise = this.sourceAdapter.read().then((data) => {
      this.putTo(this.sourceData, data)
      this.emitter.emit("sourceDataReady")
    })

    const targetPromise = this.targetAdapter.read().then((data) => {
      this.putTo(this.targetData, data)
      this.emitter.emit("targetDataReady")
    })

    await Promise.all([sourcePromise, targetPromise])

    this.sourceData.forEach(async (sourceItem, key) => {
      let targetItem = this.targetData.get(key)

      sourceItem = this.converter(sourceItem)
      
      if (!targetItem) {
        if (this.policy.create === "do") {
          await this.targetAdapter.create(sourceItem)
          this.emitter.emit("itemCreated", sourceItem)
        } else if (this.policy.create === "info") {
          console.info(`Item with key "${key}" will be created.`)
        }
        return
      } else {
        targetItem = this.converter(targetItem)
      }

      if (this.compare(sourceItem, targetItem)) {
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

  subscribe(subscriber: Partial<EventSubscriberType<T>>): () => void {
    for (const event in subscriber) {
      if (subscriber[event as keyof EventSubscriberType<T>]) {
        this.emitter.on(
          event,
          subscriber[event as keyof EventSubscriberType<T>] as any,
        )
      }
    }

    return () => {
      for (const event in subscriber) {
        if (subscriber[event as keyof EventSubscriberType<T>]) {
          this.emitter.off(
            event,
            subscriber[event as keyof EventSubscriberType<T>] as any,
          )
        }
      }
    }
  }

  protected putTo(target: Map<string, T>, data: T[]): void {
    data.forEach((item) => {
      const key = this.getCommonKey(item)

      if (target.has(key)) {
        throw new Error(`Duplicate key "${key}" found in data.`)
      }

      target.set(key, item)
    })
  }
}
