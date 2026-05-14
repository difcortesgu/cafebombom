# Import Template v2

Archivo principal: `import-template-v2.xlsx`

## Hojas incluidas

1. README
2. payment_methods
3. suppliers
4. employees
5. categories
6. ingredients
7. products
8. product_ingredients
9. product_additional_ingredients
10. restaurant_tables
11. discounts
12. surcharges
13. receipt_preferences

## Encabezados por hoja

### payment_methods
- name
- isActive

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
