import * as defs from './defs';

export type CifSectionName = keyof typeof defs;

function naive_parser(section: { name: any; items: any; }) {
  switch (section.name) {
    // case 'text':
    //   return {
    //     name: 'text',
    //     items: section.items
    //   };
    default:
      section.items.reduce((hash: { [x: string]: number; }, item: { key: string; }) => {
        hash[item.key] = (typeof hash[item.key] === 'number') ? hash[item.key]++ : 0;
        return hash;
      }, /** @type {Record<String, number>} */({}));

      return {
        name: section.name,
        def: section.items.reduce((obj: { [x: string]: any; }, item: { key: string; value: any; }) => {
          obj[item.key] = literal_parser(item.value);
          return obj;
        }, /** @type {Record<String, string | number>} */({})) 
      };
  }
}

function literal_parser_array(value: string, { is_boolean } = { is_boolean: false }) {
  const r = /(?:"([^"]+)")|([0-9]+)/g;

  const matches = value.match(r);

  if (!matches) {
    throw new Error('literal_parser: value does not match the expected pattern.');
  }

  const literals = matches.map((m: string) => {
    if (m.startsWith('"')) return m.slice(1, m.length - 1);

    const n = parseInt(m);
    if (is_boolean) return Boolean(n);
    return n;
  });

  return literals;
}

function literal_parser(value: string, { is_boolean } = { is_boolean: false }) {
  return literal_parser_array(value, { is_boolean })[0];
}

function map_parser(value: string, types: string[]): [ string, (string | number | boolean | (string | number | boolean)[] | {
  bmd: string | number | boolean;
  shadow: string | number | boolean;
})] {
  const r_key = /^(?:"([^"]+)")|([0-9]+) /;
  const m = value.match(r_key);

  if (!m) throw new Error('map_parser: value does not match the pattern.');

  const key = m[1] || m[2];

  let val

  switch (types[1]) {
    case 'bmd':
      const _v = literal_parser_array(value.replace(r_key, ''), { is_boolean: false });
      val = { bmd: _v[0], shadow: _v[1] };
      break;

    default:
      if (types[1].endsWith('[]'))
        val = literal_parser_array(value.replace(r_key, ''), { is_boolean: types[1] === 'boolean' });
      else
        val = literal_parser(value.replace(r_key, ''), { is_boolean: types[1] === 'boolean' });
  }

  return [key, val];
}

function default_parser(section: { items: { key: string; value: string; }[]; name: CifSectionName; }, def: { [x: string]: any; }) {
  const val: Record<string, any> = {};

  for (const { key, value } of section.items) {
    const type = def[key];
    if (!type) {
      val[key] = value;
      continue;
    }

    switch (type) {
      case 'string':
      case 'number':
        val[key] = literal_parser(value, { is_boolean: false });
        break;
      case 'boolean':
        val[key] = literal_parser(value, { is_boolean: true });
        break;
      case 'string[]':
      case 'number[]':
        val[key] = literal_parser_array(value, { is_boolean: false });
        break;

      case 'bmd':
        const _v = literal_parser_array(value, { is_boolean: false });
        val[key] = { bmd: _v[0], shadow: _v[1] };
        break;

      case 'number[][]':
      case 'string[][]':
        if (!Array.isArray(val[key])) val[key] = [];
        val[key].push(literal_parser_array(value, { is_boolean: false }));
        break;

      default:
        const r = /\[([a-z]+),\s*([a-z]+(?:\[\])?)\]/;
        const types = type.match(r);
        if (!types) throw new Error(`Invalid type declaration ${type}`);

        if (!val[key]) val[key] = {};
        const entry = map_parser(value, types.slice(1));
        val[key][entry[0]] = entry[1];
    }
  }

  return {
    name: section.name,
    def: val
  };
}

export function parse_section(section: { name: CifSectionName; items: { key: string; value: string; }[]; }) {
  if (defs[section.name]) {
    return default_parser(section, defs[section.name]);
  }

  return naive_parser(section);
}
