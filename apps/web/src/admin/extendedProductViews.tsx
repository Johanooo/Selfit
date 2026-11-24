import { useMemo, useState } from 'react';
import type { CategoryFilterDefinition, ProductFieldType, ProductTypeDefinition, ProductTypeField } from './extendedAdminData';
import './extendedAdmin.css';
import { InteractiveTable, useAdminListState } from './adminInteractions';

type Props = { id?: string; go: (path: string) => void; productTypes: ProductTypeDefinition[]; onProductTypesChange: (types: ProductTypeDefinition[]) => void; categoryFilters: CategoryFilterDefinition[]; onCategoryFiltersChange: (filters: CategoryFilterDefinition[]) => void };

const fieldTypes: { value: ProductFieldType; label: string }[] = [
  { value: 'text', label: 'Text' }, { value: 'number', label: 'Tal' }, { value: 'select', label: 'Val' }, { value: 'multiselect', label: 'Flera val' }, { value: 'boolean', label: 'Ja / nej' },
];

export function ProductTypesAndFiltersView({ id, go, productTypes, onProductTypesChange, categoryFilters, onCategoryFiltersChange }: Props) {
  const [notice, setNotice] = useState('');
  const active = productTypes.find((item) => item.id === id) ?? productTypes[0];
  const updateType = (typeId: string, updater: (type: ProductTypeDefinition) => ProductTypeDefinition) =>
    onProductTypesChange(productTypes.map((type) => type.id === typeId ? updater(type) : type));
  const updateField = (typeId: string, fieldId: string, updates: Partial<ProductTypeField>) =>
    updateType(typeId, (type) => ({ ...type, fields: type.fields.map((field) => field.id === fieldId ? { ...field, ...updates } : field) }));
  const addField = () => {
    if (!active) return;
    const id = `${active.id}-field-${Date.now()}`;
    updateType(active.id, (type) => ({ ...type, fields: [...type.fields, { id, name: 'Nytt fält', type: 'text', unit: '', allowedValues: [], requiredAtPublish: false }] }));
  };
  const moveField = (typeId: string, fieldId: string, direction: -1 | 1) => updateType(typeId, (type) => {
    const index = type.fields.findIndex((field) => field.id === fieldId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= type.fields.length) return type;
    const fields = [...type.fields]; [fields[index], fields[next]] = [fields[next], fields[index]];
    return { ...type, fields };
  });
  const [selectedCategory, setSelectedCategory] = useAdminListState('produkttyper', 'category', categoryFilters[0]?.category ?? 'Träning');
  const selectedFilter = categoryFilters.find((filter) => filter.category === selectedCategory) ?? { category: selectedCategory, fieldIds: [] };
  const availableFilterFields = productTypes.flatMap((type) => type.fields);

  if (!id) return <section className="xadmin-stack"><header className="xadmin-heading"><div><h1>Produkttyper & fält</h1><p>Öppna en produkttyp för att redigera fält och kategorifilter.</p></div></header><nav className="xadmin-panel xadmin-type-nav" aria-label="Produkttyper">{productTypes.map((type) => <button type="button" className="xadmin-nav-item" key={type.id} onClick={() => go(`/admin/produkttyper/${type.id}`)} data-testid={`button-product-type-${type.id}`}><span>{type.name}</span><small>{type.fields.length} fält →</small></button>)}</nav></section>;
  return <section className="xadmin-stack" aria-label="Produkttyper och kategorifilter" data-testid="view-product-types-filters">
    <header className="xadmin-heading"><div><p className="xadmin-kicker">Kataloginställningar</p><h2>Produkttyper & filter</h2><p>Styr vilka uppgifter som följer med produkterna och går att filtrera i butiken.</p></div></header>
    <div className="xadmin-layout">
      <nav className="xadmin-panel xadmin-type-nav" aria-label="Välj produkttyp">
        <h3>Produkttyper</h3>
        {productTypes.map((type) => <button type="button" className={`xadmin-nav-item ${active?.id === type.id ? 'is-active' : ''}`} key={type.id} onClick={() => go(`/admin/produkttyper/${type.id}`)} data-testid={`button-product-type-${type.id}`} aria-current={active?.id === type.id ? 'true' : undefined}><span>{type.name}</span><small>{type.fields.length} fält</small></button>)}
      </nav>
      {active && <div className="xadmin-stack">
        <section className="xadmin-panel">
          <div className="xadmin-panel-head"><div><h3>{active.name}</h3><p>Fältordningen styr även visningen i produktredigeringen.</p></div><button type="button" className="xadmin-button is-primary" onClick={addField} data-testid="button-add-product-field">Lägg till fält</button></div>
          <div className="xadmin-table-scroll"><InteractiveTable className="xadmin-table"><thead><tr><th scope="col">Fältnamn</th><th scope="col">Typ</th><th scope="col">Enhet</th><th scope="col">Tillåtna värden</th><th scope="col">Krav</th><th scope="col"><span className="xadmin-sr">Ordning</span></th></tr></thead>
            <tbody>{active.fields.map((field, index) => <tr key={field.id} data-testid={`row-product-field-${field.id}`}>
              <td><label className="xadmin-sr" htmlFor={`field-name-${field.id}`}>Fältnamn</label><input id={`field-name-${field.id}`} className="xadmin-control" value={field.name} onChange={(event) => updateField(active.id, field.id, { name: event.target.value })} data-testid={`input-field-name-${field.id}`} /></td>
              <td><label className="xadmin-sr" htmlFor={`field-type-${field.id}`}>Fälttyp</label><select id={`field-type-${field.id}`} className="xadmin-control" value={field.type} onChange={(event) => updateField(active.id, field.id, { type: event.target.value as ProductFieldType })} data-testid={`select-field-type-${field.id}`}>{fieldTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></td>
              <td><label className="xadmin-sr" htmlFor={`field-unit-${field.id}`}>Enhet</label><input id={`field-unit-${field.id}`} className="xadmin-control" value={field.unit} placeholder="Ingen enhet" onChange={(event) => updateField(active.id, field.id, { unit: event.target.value })} data-testid={`input-field-unit-${field.id}`} /></td>
              <td><label className="xadmin-sr" htmlFor={`field-values-${field.id}`}>Tillåtna värden, separerade med kommatecken</label><input id={`field-values-${field.id}`} className="xadmin-control" value={field.allowedValues.join(', ')} placeholder="Exempel: S, M, L" onChange={(event) => updateField(active.id, field.id, { allowedValues: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} disabled={field.type !== 'select' && field.type !== 'multiselect'} data-testid={`input-field-values-${field.id}`} /></td>
              <td><label className="xadmin-check"><input type="checkbox" checked={field.requiredAtPublish} onChange={(event) => updateField(active.id, field.id, { requiredAtPublish: event.target.checked })} data-testid={`check-field-required-${field.id}`} /> Obligatoriskt</label></td>
              <td><div className="xadmin-inline-actions"><button type="button" className="xadmin-icon-button" aria-label={`Flytta ${field.name} upp`} disabled={index === 0} onClick={() => moveField(active.id, field.id, -1)} data-testid={`button-field-up-${field.id}`}>Upp</button><button type="button" className="xadmin-icon-button" aria-label={`Flytta ${field.name} ned`} disabled={index === active.fields.length - 1} onClick={() => moveField(active.id, field.id, 1)} data-testid={`button-field-down-${field.id}`}>Ned</button><button type="button" className="xadmin-icon-button is-danger" aria-label={`Ta bort ${field.name}`} onClick={() => updateType(active.id, (type) => ({ ...type, fields: type.fields.filter((item) => item.id !== field.id) }))} data-testid={`button-field-delete-${field.id}`}>Ta bort</button></div></td>
            </tr>)}</tbody>
          </InteractiveTable></div>
        </section>
        <section className="xadmin-panel">
          <div className="xadmin-panel-head"><div><h3>Kategorifilter</h3><p>Välj vilka fält som ska synas som filter för kategorin.</p></div></div>
          <div className="xadmin-filter-fields">
            <label className="xadmin-field-label">Kategori<select className="xadmin-control" value={selectedFilter.category} onChange={(event) => {
              const next = event.target.value;
              setSelectedCategory(next);
              const existing = categoryFilters.find((item) => item.category === next);
              if (!existing) onCategoryFiltersChange([...categoryFilters, { category: next, fieldIds: [] }]);
            }} data-testid="select-filter-category">{['Träning', 'Hälsa', 'Skönhet'].map((category) => <option key={category}>{category}</option>)}</select></label>
            <fieldset className="xadmin-fieldset"><legend>Valbara fält</legend>{availableFilterFields.map((field) => <label className="xadmin-check" key={field.id}><input type="checkbox" checked={selectedFilter.fieldIds.includes(field.id)} onChange={(event) => {
              const current = categoryFilters.find((item) => item.category === selectedFilter.category);
              const nextIds = event.target.checked ? [...selectedFilter.fieldIds, field.id] : selectedFilter.fieldIds.filter((id) => id !== field.id);
              const next = { category: selectedFilter.category, fieldIds: nextIds };
              onCategoryFiltersChange(current ? categoryFilters.map((item) => item.category === selectedFilter.category ? next : item) : [...categoryFilters, next]);
            }} data-testid={`check-category-filter-${field.id}`} />{field.name}</label>)}</fieldset>
            <ol className="xadmin-filter-order" aria-label="Ordning på kategorifilter">{selectedFilter.fieldIds.map((id, index) => {
              const field = availableFilterFields.find((item) => item.id === id);
              if (!field) return null;
              return <li key={id}><span>{index + 1}. {field.name}</span><div className="xadmin-inline-actions"><button type="button" disabled={index === 0} className="xadmin-icon-button" onClick={() => {
                const reordered = [...selectedFilter.fieldIds]; [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
                onCategoryFiltersChange(categoryFilters.map((item) => item.category === selectedFilter.category ? { ...item, fieldIds: reordered } : item));
              }} aria-label={`Flytta ${field.name} upp`} data-testid={`button-filter-up-${id}`}>Upp</button><button type="button" disabled={index === selectedFilter.fieldIds.length - 1} className="xadmin-icon-button" onClick={() => {
                const reordered = [...selectedFilter.fieldIds]; [reordered[index + 1], reordered[index]] = [reordered[index], reordered[index + 1]];
                onCategoryFiltersChange(categoryFilters.map((item) => item.category === selectedFilter.category ? { ...item, fieldIds: reordered } : item));
              }} aria-label={`Flytta ${field.name} ned`} data-testid={`button-filter-down-${id}`}>Ned</button></div></li>;
            })}</ol>
          </div>
          <div className="xadmin-local-note" role="status" data-testid="status-product-types">{notice || 'Ändringar gäller endast i den här prototypen.'}</div>
          <button type="button" className="xadmin-button" onClick={() => setNotice('Produkttyper och filter har bekräftats lokalt. Inget har sparats på en server.')} data-testid="button-confirm-product-types">Bekräfta lokalt</button>
        </section>
      </div>}
    </div>
  </section>;
}

export function ProductTypeFieldsEditor({ productType, productTypes }: { productType: string; productTypes: ProductTypeDefinition[] }) {
  const definition = useMemo(() => productTypes.find((item) => item.id === productType || item.name === productType), [productType, productTypes]);
  const [values, setValues] = useState<Record<string, string | boolean | string[]>>({});
  if (!definition) return <div className="xadmin-empty" role="status" data-testid="empty-product-type-fields">Välj en produkttyp för att visa dess fält.</div>;
  return <section className="xadmin-field-editor" aria-label={`Fält för ${definition.name}`} data-testid={`editor-product-type-${definition.id}`}>
    <h3>{definition.name}</h3><p>Fälten följer definitionen för den valda produkttypen.</p>
    <div className="xadmin-editor-grid">{definition.fields.map((field) => {
      const value = values[field.id];
      const id = `type-value-${field.id}`;
      if (field.type === 'boolean') return <label className="xadmin-check" key={field.id}><input id={id} type="checkbox" checked={Boolean(value)} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.checked }))} data-testid={`input-type-value-${field.id}`} />{field.name}{field.requiredAtPublish && <span className="xadmin-required">Obligatoriskt</span>}</label>;
      if (field.type === 'select' || field.type === 'multiselect') return <div className="xadmin-field-label" key={field.id}><label htmlFor={id}>{field.name}{field.requiredAtPublish ? ' · obligatoriskt' : ''}</label><select id={id} className="xadmin-control" multiple={field.type === 'multiselect'} value={field.type === 'multiselect' ? (Array.isArray(value) ? value : []) : (typeof value === 'string' ? value : '')} onChange={(event) => setValues((current) => ({ ...current, [field.id]: field.type === 'multiselect' ? Array.from(event.target.selectedOptions, (option) => option.value) : event.target.value }))} data-testid={`input-type-value-${field.id}`}><option value="" disabled>{field.type === 'select' ? 'Välj värde' : 'Välj ett eller flera värden'}</option>{field.allowedValues.map((option) => <option value={option} key={option}>{option}</option>)}</select>{field.unit && <small>{field.unit}</small>}</div>;
      return <div className="xadmin-field-label" key={field.id}><label htmlFor={id}>{field.name}{field.requiredAtPublish ? ' · obligatoriskt' : ''}</label><div className="xadmin-unit-input"><input id={id} className="xadmin-control" type={field.type === 'number' ? 'number' : 'text'} value={typeof value === 'string' ? value : ''} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} data-testid={`input-type-value-${field.id}`} />{field.unit && <span>{field.unit}</span>}</div></div>;
    })}</div>
  </section>;
}
