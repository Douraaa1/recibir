# Relations

`static relations(): RelationConfig[]` adds related-record panels to a resource's view page. Each config points at another resource and describes the keys that join them.

```ts
import type { RelationConfig } from '@maxal_studio/kratosjs';
import { OrderItemResource } from './OrderItemResource';

static relations(): RelationConfig[] {
	return [
		{
			name: 'items',                 // unique, used in the relation URL
			resource: OrderItemResource,   // the related resource CLASS
			label: 'Item',
			pluralLabel: 'Products',
			icon: 'Package',
			localKey: 'id',                // field on THIS resource
			foreignKey: 'order',           // field on the related resource that points back here
			relatedKey: 'id',              // field on the related resource (defaults to 'id' / '_id')
		},
	];
}
```

## `RelationConfig`

```ts
{
	name: string;              // unique relation id (used in URLs)
	resource: ResourceClass;   // related resource
	label?: string;
	pluralLabel?: string;
	icon?: string;             // Lucide icon
	group?: { key: string; label: string; icon?: string }; // group several relations under one tab
	localKey: string;          // field on the current resource (SQL: 'id', Mongo: '_id')
	foreignKey: string;        // field on the related resource referencing the current one
	relatedKey?: string;       // field on the related resource (defaults to id/_id)
}
```

## Has-many (one-to-many)

A parent shows an inline panel of children. Above, an `Order` lists its `OrderItem`s (`localKey: 'id'` on Order ↔ `foreignKey: 'order'` on OrderItem). The panel lets you list, create, edit, and delete children.

## Many-to-many via a join resource

KratosJs models m:n with an **explicit join entity/resource**, not a `m:n` property. Example: `Order` ↔ `Product` through `OrderItem` (which also carries `quantity`, `unitPrice`).

- Give the join its own entity + resource (`OrderItemResource`). Mark it `static hidden = true` so it doesn't clutter the sidebar but stays routable.
- Add a has-many relation from each side to the join resource.
- The join resource's `recordTitleAttribute` can be a function: `(record) => record?.product?.name ?? 'Item'`.

## Relation-create needs the FK in the child form (Gotcha #3)

When you create a related record from a parent's relation panel, the parent's key is injected — but it only persists if the **child's `form()` declares that foreign-key field**. Declare it as a hidden `SelectInput`:

```ts
// In OrderItemResource.form()
SelectInput.make('order').relationship('order', 'orderNumber', 'orders').hidden(),
```

Without this hidden field the FK is dropped and the child is created orphaned (no parent link).

## Showing related data as identity cells

In the join/child resource's table, render the other side as an image+name deeplink cell (name the column `productCard`, read `row.product`, deeplink to `'products'`). See `references/cells.md` and Gotcha #2.
