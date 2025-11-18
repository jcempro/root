// -------------------------------------------------------------
//  UNIVERSAL RUNTIME DETECTION
// -------------------------------------------------------------
const isNODE =
	typeof process !== 'undefined' &&
	typeof process.versions === 'object' &&
	!!process.versions.node;

// Lazy requires (não interferem com bundlers)
let fs = null;
let https = null;
let path = null;
let ROOT = '/';

if (isNODE) {
	fs = require('fs');
	https = require('https');
	path = require('path');
	ROOT = process.cwd();
}

const universalStorage = {
	_data: {},
	getItem(key) {
		return this._data[key] !== undefined ? this._data[key] : null;
	},
	setItem(key, value) {
		this._data[key] = value;
	},
	removeItem(key) {
		delete this._data[key];
	},
	clear() {
		this._data = {};
	},
};

// -------------------------------------------------------------
//  CONSTANTES & FUNÇÕES AUXILIARES
// -------------------------------------------------------------
const REGEX_PROTOCOL = /^\s*[a-zA-Z]+:\/\//;
const REGEX_LOCAL = /^(?!(?:[a-zA-Z]+:)?\/\/|[a-zA-Z]:\\|\/).*/;

// Retorno válido
const V_RETURN = (v, podenull = 0) =>
	v !== undefined &&
	(podenull || v !== null) &&
	!(
		Array.isArray(v) &&
		v.length === 1 &&
		Array.isArray(v[0]) &&
		v[0].length === 1 &&
		Array.isArray(v[0][0]) &&
		v[0][0].length === 1 &&
		typeof v[0][0][0] === 'number' &&
		v[0][0][0] < 0
	);

// -------------------------------------------------------------
//  localStorage universal
// -------------------------------------------------------------

function setItemLocalStorage(key, value) {
	try {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(key, JSON.stringify(value));
		} else {
			universalStorage.setItem(key, JSON.stringify(value));
		}
	} catch (e) {
		console.error('Erro setItemLocalStorage:', e);
	}
	return value;
}

function getItemLocalStorage(key, defaultValue = undefined) {
	try {
		let v =
			typeof localStorage !== 'undefined'
				? localStorage.getItem(key)
				: universalStorage.getItem(key);

		if (v === null || v === undefined) {
			v = setItemLocalStorage(
				key,
				typeof defaultValue === 'function'
					? defaultValue()
					: defaultValue,
			);
		}
		return JSON.parse(v);
	} catch (e) {
		return defaultValue;
	}
}

// -------------------------------------------------------------
//  FUNÇÃO _GET (UNIVERSAL)
// -------------------------------------------------------------
async function _GET(url) {
	const isProtocol = REGEX_PROTOCOL.test(url);
	const is_relative = !isProtocol && REGEX_LOCAL.test(url);
	const hasFETCH = typeof fetch === 'function';

	// ---------------------------
	// FUNÇÕES AUXILIARES INTERNAS
	// ---------------------------

	// Remove duplicados e normaliza caminhos
	const uniq = (arr) => [...new Set(arr.map(String))];

	const normalize = (p) =>
		p.replace(/\/\/+/g, '/').replace(/\\+/g, '/');

	const buildFallbacks = (u) => {
		const list = [u];

		if (is_relative) {
			list.push('./' + u, '../' + u, '../../' + u);
		}

		if (isNODE) {
			list.push(path.join(ROOT, u));
			if (is_relative) {
				list.push(
					path.join(ROOT, './', u),
					path.join(ROOT, '../', u),
					path.join(ROOT, '../../', u),
				);
			}
		}

		return uniq(list.map(normalize));
	};

	const loadLocal = (file) => {
		try {
			if (isNODE && fs.existsSync(file)) {
				return JSON.parse(fs.readFileSync(file, 'utf8'));
			}
		} catch (e) {
			return [[[-105]]];
		}
		return [[[-103]]];
	};

	const loadViaHTTPS = (link) =>
		new Promise((resolve, reject) => {
			https
				.get(link, (resp) => {
					let data = '';
					resp.on('data', (c) => (data += c));
					resp.on('end', () => {
						try {
							resolve(JSON.parse(data));
						} catch (err) {
							reject(err);
						}
					});
				})
				.on('error', reject);
		});

	const loadViaFetch = async (link) => {
		if (isNODE && !isProtocol) return [[[-107]]];
		const r = await fetch(link);
		if (!r.ok) return [[[-104]]];
		return r.json();
	};

	const tryPaths = async (paths) => {
		for (const p of paths) {
			console.log(` - tentando: ${p}`);

			try {
				let rr;
				if (isNODE && !isProtocol) rr = loadLocal(p);
				else if (!hasFETCH && isProtocol) rr = await loadViaHTTPS(p);
				else if (hasFETCH) rr = await loadViaFetch(p);
				else rr = [[[-106]]];

				if (V_RETURN(rr)) return rr;
			} catch (e) {
				console.warn('Erro:', e);
			}
		}
		return [[[-102]]];
	};

	// ---------------------------
	// EXECUÇÃO
	// ---------------------------
	const result = await tryPaths(buildFallbacks(url));
	return V_RETURN(result) ? result : undefined;
}

// =========================================================
//  EXPORTAÇÃO UNIVERSAL (CJS)
// =========================================================
module.exports = {
	isNODE,
	REGEX_PROTOCOL,
	REGEX_LOCAL,
	setItemLocalStorage,
	getItemLocalStorage,
	_GET,
};

// EXPORTAÇÃO GLOBAL (browser)
if (typeof globalThis !== 'undefined') {
	globalThis.isNODE = isNODE;
	globalThis.REGEX_PROTOCOL = REGEX_PROTOCOL;
	globalThis.REGEX_LOCAL = REGEX_LOCAL;
	globalThis.setItemLocalStorage = setItemLocalStorage;
	globalThis.getItemLocalStorage = getItemLocalStorage;
	globalThis._GET = _GET;
}
