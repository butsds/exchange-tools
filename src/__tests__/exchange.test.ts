import { describe, it, expect, vi } from "vitest"
import { Exchange } from "../classes/exchange"

interface TestData {
  id: string
  name: string
}

class TestExchange extends Exchange<TestData> {
  getCommonKey(data: TestData): string {
    return data.id
  }

  compare(source: TestData, target: TestData): boolean {
    return source.name === target.name
  }

  getUpdateData(source: TestData): Partial<TestData> | false {
    return source
  }
}

class MockAdapter {
  private data: TestData[] = []

  async create(data: TestData): Promise<void> {
    this.data.push(data)
  }

  async read(): Promise<TestData[]> {
    return [...this.data]
  }

  async update(data: Partial<TestData>): Promise<void> {
    const index = this.data.findIndex((item) => item.id === data.id)
    if (index !== -1) {
      this.data[index] = { ...this.data[index], ...data }
    }
  }

  async delete(data: Partial<TestData>): Promise<void> {
    this.data = this.data.filter((item) => item.id !== data.id)
  }
}

describe("Exchange", () => {
  it("should sync data from source to target", async () => {
    const sourceAdapter = new MockAdapter()
    const targetAdapter = new MockAdapter()

    // Setup source data
    await sourceAdapter.create({ id: "1", name: "Item 1" })
    await sourceAdapter.create({ id: "2", name: "Item 2" })

    // Setup target data with one matching and one different
    await targetAdapter.create({ id: "1", name: "Item 1" })
    await targetAdapter.create({ id: "3", name: "Item 3" })

    const exchange = new TestExchange(sourceAdapter, targetAdapter)
    exchange.setPolicy({ create: "do", delete: "do" })

    await exchange.run()

    const targetData = await targetAdapter.read()
    expect(targetData).toHaveLength(2)
    expect(targetData.find((item) => item.id === "1")).toEqual({
      id: "1",
      name: "Item 1",
    })
    expect(targetData.find((item) => item.id === "2")).toEqual({
      id: "2",
      name: "Item 2",
    })
    expect(targetData.find((item) => item.id === "3")).toBeUndefined()
  })

  it("should emit events to subscribers", async () => {
    const sourceAdapter = new MockAdapter()
    const targetAdapter = new MockAdapter()

    // Setup source data
    await sourceAdapter.create({ id: "1", name: "Item 1" })
    await sourceAdapter.create({ id: "2", name: "Item 2" })

    // Setup target data with one matching and one different
    await targetAdapter.create({ id: "1", name: "Item 1" })
    await targetAdapter.create({ id: "3", name: "Item 3" })

    const exchange = new TestExchange(sourceAdapter, targetAdapter)
    exchange.setPolicy({ create: "do", delete: "do" })

    const runBeforeSpy = vi.fn()
    const runAfterSpy = vi.fn()
    const sourceDataReadySpy = vi.fn()
    const targetDataReadySpy = vi.fn()
    const itemCreatedSpy = vi.fn()
    const itemUpdatedSpy = vi.fn()
    const itemDeletedSpy = vi.fn()

    const unsubscribe = exchange.subscribe({
      runBefore: runBeforeSpy,
      runAfter: runAfterSpy,
      sourceDataReady: sourceDataReadySpy,
      targetDataReady: targetDataReadySpy,
      itemCreated: itemCreatedSpy,
      itemUpdated: itemUpdatedSpy,
      itemDeleted: itemDeletedSpy,
    })

    await exchange.run()

    expect(runBeforeSpy).toHaveBeenCalledTimes(1)
    expect(runAfterSpy).toHaveBeenCalledTimes(1)
    expect(sourceDataReadySpy).toHaveBeenCalledTimes(1)
    expect(targetDataReadySpy).toHaveBeenCalledTimes(1)
    expect(itemCreatedSpy).toHaveBeenCalledTimes(1)
    expect(itemCreatedSpy).toHaveBeenCalledWith({ id: "2", name: "Item 2" })
    expect(itemUpdatedSpy).toHaveBeenCalledTimes(0)
    expect(itemDeletedSpy).toHaveBeenCalledTimes(1)
    expect(itemDeletedSpy).toHaveBeenCalledWith({ id: "3", name: "Item 3" })

    unsubscribe()
  })

  it("should throw error on duplicate keys in source data", async () => {
    const sourceAdapter = new MockAdapter()
    const targetAdapter = new MockAdapter()

    // Create duplicate keys in source
    await sourceAdapter.create({ id: "1", name: "Item 1" })
    await sourceAdapter.create({ id: "1", name: "Item 1 Duplicate" }) // Same id

    const exchange = new TestExchange(sourceAdapter, targetAdapter)

    await expect(exchange.run()).rejects.toThrow(
      'Duplicate key "1" found in data.',
    )
  })

  it("should throw error on duplicate keys in target data", async () => {
    const sourceAdapter = new MockAdapter()
    const targetAdapter = new MockAdapter()

    await sourceAdapter.create({ id: "1", name: "Item 1" })

    // Create duplicate keys in target
    await targetAdapter.create({ id: "1", name: "Item 1" })
    await targetAdapter.create({ id: "1", name: "Item 1 Duplicate" }) // Same id

    const exchange = new TestExchange(sourceAdapter, targetAdapter)

    await expect(exchange.run()).rejects.toThrow(
      'Duplicate key "1" found in data.',
    )
  })
})
