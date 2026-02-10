export interface EventSubscriberType<T extends object> {
  runBefore: () => void
  runAfter: () => void
  sourceDataReady: () => void
  targetDataReady: () => void
  itemCreated: (item: T) => void
  itemUpdated: (item: Partial<T>) => void
  itemDeleted: (item: T) => void
}

export interface ExchangeType {
  run(): Promise<void>
}

export interface AdapterType<T extends object> {
  create(data: T): Promise<void>
  read(): Promise<T[]>
  update(data: Partial<T>): Promise<void>
  delete(data: Partial<T>): Promise<void>
}

export type ActionType = "do" | "skip" | "info"

export interface ExchangePolicyType {
  create?: ActionType
  update?: ActionType
  delete?: ActionType
}
