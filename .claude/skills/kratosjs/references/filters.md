# Table filters

Filters go on the table via `.filters([...])`. Import from `@maxal_studio/kratosjs`.

```ts
import { TableBuilder, SelectFilter, TernaryFilter, DateFilter } from '@maxal_studio/kratosjs';

static table() {
	return TableBuilder.make()
		.columns([...])
		.filters([
			SelectFilter.make('status').options({ pending: 'Pending', paid: 'Paid', shipped: 'Shipped' }),
			TernaryFilter.make('active').label('Active'),
			DateFilter.make('createdAt').label('Created'),
		])
		.filtersLayout('popover'); // optional layout control
}
```

## Filter types

| Class                | Use                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `SelectFilter`       | Dropdown of `.options({ value: label })`; filters where the column equals the chosen value. Supports `.multiple()`. |
| `TernaryFilter`      | Three-state (all / true / false) for booleans.                                                                      |
| `DateFilter`         | Date or date-range filtering on a date column.                                                                      |
| `QueryBuilderFilter` | Advanced multi-condition builder (AND/OR groups) over allowed fields.                                               |
| `CustomFilter`       | Fully custom filter backed by your own React component + server predicate.                                          |

`QueryBuilderFilter` and `CustomFilter` have matching client components (`QueryBuilderFilterComponent`, `CustomFilterComponent`) exported from `@maxal_studio/kratosjs-react` when you need to customize rendering.

## Notes

- Filters are declarative and serialize to the client; the server applies them to the MikroORM query.
- Combine with `.searchable()` (free-text search across searchable columns) and column `.sortable()` for a full list experience.
- For grouped metrics above the table, use `.metrics([...])` and `.groupBy(field)` / `.grouping(...)` on the `TableBuilder`.
