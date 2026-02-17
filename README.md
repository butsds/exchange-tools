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

Or install from GitHub Packages:

```bash
npm install @butsds/exchange-tools --registry=https://npm.pkg.github.com
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
const exchange = new Exchange<User, User>(sourceAdapter, targetAdapter)

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

### Exchange<S, T>

Main synchronization class.

#### Constructor

```typescript
new Exchange<S, T>(sourceAdapter: AdapterType<S>, targetAdapter: AdapterType<T>)
```

#### Methods

- `setPolicy(policy: Partial<ExchangePolicyType>): this` - Set operation policies
- `subscribe(subscriber: Partial<EventSubscriberType<S, T>>): () => void` - Subscribe to events
- `run(): Promise<void>` - Execute synchronization

### AdapterType<T>

Interface for data adapters.

```typescript
interface AdapterType<T> {
  read(): Promise<T[]>
  create(data: T): Promise<string | number | bigint>
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

### ConverterType<T>

Function type for data conversion.

```typescript
type ConverterType<T> = (data: T) => T
```

## Synchronization Logic

1. Read data from source and target adapters
2. Compare items by keys (defined by `getSourceKey` and `getTargetKey` methods)
3. For items in source but not in target: create
4. For items in both: update if different
5. For items in target but not in source: delete

## Extending Exchange

Create a concrete class extending `Exchange<S, T>`:

```typescript
class MyExchange extends Exchange<SourceData, TargetData> {
  getSourceKey(data: SourceData): string {
    return data.id
  }

  getTargetKey(data: TargetData): string {
    return data.id
  }

  getUpdateData(source: SourceData, target: TargetData): Partial<TargetData> | false {
    // Return update data or false to skip update
    if (source.version === target.version) {
      return false // No update needed
    }
    return { version: source.version } // Update only version
  }

  convertSourceToTarget(source: SourceData): TargetData {
    return {
      id: source.id,
      name: source.name,
      // Convert other fields as needed
    }
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

## Publishing

To publish a new version:

1. Create a git tag with version: `git tag v1.0.0`
2. Push the tag: `git push origin v1.0.0`
3. GitHub Actions will automatically build and publish to GitHub Packages

The package version will be automatically set from the tag name.

## Changelog

### [Unreleased]

- **Breaking Change**: `Exchange` class now supports different source and target types: `Exchange<S, T>`. Requires implementing `getSourceKey`, `getTargetKey`, `convertSourceToTarget` methods.
- **Breaking Change**: `EventSubscriberType` now takes two type parameters: `EventSubscriberType<S, T>`.
- **Breaking Change**: Removed the `converter` functionality from `Exchange` class. The `setConverter` method and data transformation before comparison are no longer supported.
- **Breaking Change**: Removed the `compare` method from `Exchange` class. Update logic now relies solely on `getUpdateData` method returning `false` to skip updates.
- **Breaking Change**: `AdapterType.create` method now returns `Promise<string | number | bigint>` instead of `Promise<void>`. This allows adapters to return identifiers or status codes after creation.

## License

MIT
