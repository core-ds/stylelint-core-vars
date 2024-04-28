# stylelint-core-vars

[![NPM Version](https://img.shields.io/npm/v/@alfalab/stylelint-core-vars.svg)](https://www.npmjs.com/package/@alfalab/stylelint-core-vars)

[Stylelint](http://stylelint.io) плагин, проверяющий использование [дизайн-токенов](https://github.com/alfa-laboratory/core-components/tree/master/packages/vars/src)

## Установка

```
yarn add --dev stylelint @alfalab/stylelint-core-vars
```

или

```
npm install --save-dev stylelint @alfalab/stylelint-core-vars
```

## Использование

Добавьте в свой stylelint конфиг:

```
{
  "plugins": [
    "@alfalab/stylelint-core-vars"
  ],
  "rules": {
      "stylelint-core-vars/use-vars": [
        true,
        {
            "allowNumericValues": true
        }
    ],
      "stylelint-core-vars/use-mixins": true,
      "stylelint-core-vars/use-one-of-vars": [
          true,
          {
              "severity": "warning"
          }
      ],
      "stylelint-core-vars/use-one-of-mixins": [
          true,
          {
              "severity": "warning"
          }
      ],
      "stylelint-core-vars/do-not-use-dark-colors": [
          true,
          {
              "severity": "warning"
          }
      ],
      "stylelint-core-vars/do-not-use-old-vars": [
          true,
          {
              "severity": "warning"
          }
      ],
  },
}
```

## Лицензия

```
The MIT License (MIT)

Copyright (c) 2024 core-ds contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
