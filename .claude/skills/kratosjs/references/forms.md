# Forms

`form()` returns `FormBuilder.make().schema([ ...fields ])`. Fields are created with `Input.make('fieldName')` and chained.

```ts
import {
	FormBuilder, TextInput, Textarea, SelectInput, Checkbox, Toggle, Radio,
	DateTimePicker, ColorPicker, FileUpload, RichEditor, Repeater, Section,
	Group, TagsInput, Tabs, HiddenInput, type FormContext,
} from '@maxal_studio/kratosjs';

static form() {
	return FormBuilder.make().schema([
		FileUpload.make('image').label('Image').image(),
		TextInput.make('name').label('Name').required().min(2).max(120),
		TextInput.make('price').label('Price').type('number').required().minValue(0),
		SelectInput.make('brand').label('Brand').relationship('brand', 'name', 'brands').searchable(),
		SelectInput.make('status').options({ pending: 'Pending', paid: 'Paid' }).default('pending').required(),
		Textarea.make('description').rows(5),
		Toggle.make('active').default(true),
	]);
}
```

## Input types

| Class               | Notes                                                                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TextInput`         | `.type('number'\|'email'\|'password'\|'tel'\|'url')` or shortcuts `.password()`, `.email()`, `.url()`, `.tel()`, `.numeric()`; numeric range `.minValue(n)` / `.maxValue(n)` / `.step(n)`; `.mask(...)`, `.inputMode(...)`. |
| `Textarea`          | `.rows(n)`.                                                                                                                                                                                                                 |
| `SelectInput`       | `.options({ value: label })` **or** `.relationship(field, titleAttr, resourceSlug)`; `.multiple()`, `.native()`, `.searchable()`, `.creatable()` + `.createOptionForm(FormBuilder)`, `.formatOptionLabelUsing(fn)`.         |
| `Checkbox`          | Single boolean checkbox.                                                                                                                                                                                                    |
| `Toggle`            | Boolean switch.                                                                                                                                                                                                             |
| `Radio`             | `.options({ value: label })`.                                                                                                                                                                                               |
| `DateTimePicker`    | Date / datetime picker.                                                                                                                                                                                                     |
| `ColorPicker`       | Color value.                                                                                                                                                                                                                |
| `FileUpload`        | `.image()`, `.multiple()`, `.acceptedFileTypes([...])`, `.maxSize(bytes)`, `.directory('x')`, `.disk('local-uploads')`, `.visibility('public')`. Stores media JSON.                                                         |
| `RichEditor`        | TipTap rich-text HTML.                                                                                                                                                                                                      |
| `TagsInput`         | Free-form tag list.                                                                                                                                                                                                         |
| `Repeater`          | Repeatable sub-form: `.schema([...])`.                                                                                                                                                                                      |
| `Section` / `Group` | Layout wrappers grouping fields: `.schema([...])`.                                                                                                                                                                          |
| `Tabs`              | Tabbed layout of field groups.                                                                                                                                                                                              |
| `HiddenInput`       | Non-visible value carried through the form.                                                                                                                                                                                 |

## Common methods (all inputs)

`.label(text)`, `.required(cond?)`, `.default(value)`, `.hidden(cond?)`, `.disabled(cond?)`, `.readOnly(cond?)`, `.placeholder(text)`, `.helperText(text)`, `.hint(text)`, `.columnSpan(n)` / `.columnSpanFull()`, `.searchable()`, `.afterStateUpdated(fn)`.

## Validation

Chainable rules live on every field: `.required()`, `.min(n)` / `.max(n)` (numeric), `.minLength(n)` / `.maxLength(n)`, `.email()`, `.url()`, `.numeric()`, `.integer()`, `.alpha()`, `.alphaNum()`, `.alphaDash()`, `.uuid()`, `.regex(re)`, `.confirmed()`, `.same('otherField')`, and custom `.rule(fn)` / `.rules([...])`. Validation is isomorphic (same engine front and back); failures return HTTP 400.

## Conditional fields (`FormContext`)

`.required()`, `.hidden()`, and `.disabled()` accept a boolean **or** a predicate receiving a `FormContext`. The context exposes the current operation and field values:

```ts
TextInput.make('password')
	.password()
	.required((c: FormContext) => c?.operation === 'create') // only required on create
	.hidden((c: FormContext) => c?.operation === 'view'); // hidden on the view screen

TextInput.make('verifyReason')
	.required()
	.hidden(c => !c.get('isVerified')); // depends on another field's value
```

`c.operation` is `'create' | 'edit' | 'view'`; `c.get('field')` reads a sibling field's current value.

## Custom fields

Register a custom React field component on the client and reference it by name — see the custom-fields section of the framework docs and `references/plugins.md` for the client-side registration pattern.
