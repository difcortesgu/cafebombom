# Import Template v2

Archivo principal: `import-template-v2.xlsx`

## Hojas incluidas

1. README
2. suppliers
3. employees
4. categories
5. ingredients
6. products
7. product_ingredients
8. product_additional_ingredients
9. restaurant_tables
10. discounts
11. surcharges
12. receipt_preferences

## Encabezados por hoja

### suppliers
- name
- phone
- notes

### employees
- name
- salaryType
- rate

### categories
- name

### ingredients
- name
- unit
- quantity
- lowStockThreshold
- supplierName

### products
- name
- categoryName
- price
- isActive
- imageUri

### product_ingredients
- productName
- ingredientName
- quantityUsed

### product_additional_ingredients
- productName
- ingredientName
- quantityUsed
- additionalPrice

### restaurant_tables
- name
- tableType

### discounts
- name
- scope
- productName
- type
- value
- startsAt
- endsAt
- isActive

### surcharges
- name
- value

### receipt_preferences
- businessName
- businessAddress
- businessPhone
- businessNit
- businessLogoUri
- footerMessage
- paperWidth
- taxRate

## Valores válidos clave

- tableType: dine-in | to-go | delivery
- scope: product | global
- type (discount): percentage | fixed
- salaryType: hourly | monthly
- surcharge name: to-go | delivery
- booleans: true/false, yes/no, si/no, 1/0

## Nota

La importación v2 corre en transacción fail-fast y modo upsert.
