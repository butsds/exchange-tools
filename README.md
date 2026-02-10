# Exchange Tools

A TypeScript library for synchronizing data between different sources and targets using adapter pattern.

## Features

- **Adapter Pattern**: Pluggable adapters for different data sources/targets
- **Event-Driven**: Subscribe to synchronization events
- **Type-Safe**: Full TypeScript support with generic types
- **Policy-Based**: Configurable policies for create/update/delete operations
- **Duplicate Detection**: Automatic detection of duplicate keys

## Installation

```bash
npm install @butsds/exchange-tools
```

## Quick Start

```typescript
import { Exchange } from "@butsds/exchange-tools"

// Define your data type
interface User {
  id: string
  name: string
  email: string
}

// Create adapters (implement AdapterType<T>)
class DatabaseAdapter implements AdapterType<User> {
  // Implement read, create, update, delete methods
}

// Create exchange instance
const exchange = new Exchange<User>(sourceAdapter, targetAdapter)

// Set policies (optional)
exchange.setPolicy({
  create: "do", // 'do' | 'skip' | 'info'
  update: "do",
  delete: "do",
})

// Subscribe to events (optional)
const unsubscribe = exchange.subscribe({
  runBefore: () => console.log("Starting sync..."),
  runAfter: () => console.log("Sync completed"),
  itemCreated: (item) => console.log("Created:", item),
  itemUpdated: (data) => console.log("Updated:", data),
  itemDeleted: (item) => console.log("Deleted:", item),
})

// Run synchronization
await exchange.run()

// Cleanup
unsubscribe()
```

## API Reference

### Exchange<T>

Main synchronization class.

#### Constructor

```typescript
new Exchange<T>(sourceAdapter: AdapterType<T>, targetAdapter: AdapterType<T>)
```

#### Methods

- `setPolicy(policy: Partial<ExchangePolicyType>): this` - Set operation policies
- `subscribe(subscriber: Partial<EventSubscriberType<T>>): () => void` - Subscribe to events
- `run(): Promise<void>` - Execute synchronization

### AdapterType<T>

Interface for data adapters.

```typescript
interface AdapterType<T> {
  read(): Promise<T[]>
  create(data: T): Promise<void>
  update(data: Partial<T>): Promise<void>
  delete(data: Partial<T>): Promise<void>
}
```

### ExchangePolicyType

```typescript
interface ExchangePolicyType {
  create?: "do" | "skip" | "info"
  update?: "do" | "skip" | "info"
  delete?: "do" | "skip" | "info"
}
```

### EventSubscriberType<T>

```typescript
interface EventSubscriberType<T> {
  runBefore: () => void
  runAfter: () => void
  sourceDataReady: () => void
  targetDataReady: () => void
  itemCreated: (item: T) => void
  itemUpdated: (item: Partial<T>) => void
  itemDeleted: (item: T) => void
}
```

## Synchronization Logic

1. Read data from source and target adapters
2. Compare items by common key (defined by `getCommonKey` method)
3. For items in source but not in target: create
4. For items in both: update if different
5. For items in target but not in source: delete

## Extending Exchange

Create a concrete class extending `Exchange<T>`:

```typescript
class MyExchange extends Exchange<MyData> {
  getCommonKey(data: MyData): string {
    return data.id
  }

  compare(source: MyData, target: MyData): boolean {
    return source.version === target.version
  }

  getUpdateData(source: MyData, target: MyData): Partial<MyData> | false {
    // Return update data or false to skip
  }
}
```

## Error Handling

- Throws error on duplicate keys within same adapter
- Adapter methods should handle their own errors

## Dependencies

- [eventemitter3](https://www.npmjs.com/package/eventemitter3) - Event emitter

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build library
npm run build

# Type checking
npx tsc --noEmit
```

## License

MIT
