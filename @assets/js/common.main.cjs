// --- Importações Condicionais para Node.js ---
let fs, path, https;
const isNODE = typeof window === 'undefined';

if (isNODE) {
	// Usamos require para evitar problemas com bundlers que tentam empacotar módulos nativos do Node
	fs = require('fs');
	path = require('path');
	https = require('https');
}

// --- Constantes e Funções Auxiliares (Disponíveis em ambos) ---

const REGEX_PROTOCOL = /^\s*[^:\/\\]:\/\//i;
const REGEX_LOCAL = /^(?!(?:[a-zA-Z]+:)?\/\/|[a-zA-Z]:\\|\/).*/;
const ROOT = process.cwd(); // Diretório raiz do processo atual no Node

// Função auxiliar simples para validar retorno
const VReturn = (v) =>
	v !== undefined &&
	v !== null &&
	v !== -102 &&
	v !== -103 &&
	v !== -104 &&
	v !== -105 &&
	v !== -106 &&
	v !== -107;

/**
 * Define um item no localStorage, convertendo objetos/arrays para string JSON.
 * Funciona no navegador. No Node.js, ele tentará usar o localStorage se disponível (ex: em jsdom).
 * @param {string} key - A chave do item.
 * @param {any} value - O valor a ser armazenado.
 */
function setItemLocalStorage(key, value) {
	if (typeof localStorage === 'undefined') {
		console.warn('localStorage não está disponível neste ambiente.');
		return value;
	}
	try {
		const serializedValue = JSON.stringify(value);
		localStorage.setItem(key, serializedValue);
	} catch (error) {
		console.error(
			`Erro ao salvar a chave "${key}" no localStorage:`,
			error,
		);
	}

	return value;
}

/**
 * Obtém um item do localStorage e o converte de volta para o tipo original.
 * Se a chave não existir, retorna um valor padrão (fallback).
 *
 * @param {string} key - A chave do item.
 * @param {any} [defaultValue=undefined] - O valor padrão a ser retornado se a chave não existir.
 * @returns {any} O valor armazenado ou o valor padrão.
 */
function getItemLocalStorage(key, defaultValue = undefined) {
	if (typeof localStorage === 'undefined') {
		return defaultValue;
	}

	try {
		let serializedValue = localStorage.getItem(key);

		// Se não houver valor armazenado (null ou undefined), retorna o padrão imediatamente.
		if (serializedValue === null || serializedValue === undefined) {
			serializedValue = setItemLocalStorage(
				key,
				typeof defaultValue === 'function'
					? defaultValue()
					: defaultValue,
			);
		}

		// Tenta fazer o parse do valor string de volta para objeto/array/etc.
		const parsedValue = JSON.parse(serializedValue);

		// Verifica se o valor parsed é nulo ou undefined (caso o JSON.parse retorne isso)
		if (parsedValue === null || parsedValue === undefined) {
			return defaultValue;
		}

		return parsedValue;
	} catch (error) {
		return defaultValue; // Retorna o valor padrão em caso de erro de parsing
	}
}

// O restante da função _GET precisa de várias dependências do Node.js
async function _GET(url) {
	const isProtocol = REGEX_PROTOCOL.test(url);
	const is_relative = !isProtocol || REGEX_LOCAL.test(url);
	const hasFETCH = typeof fetch !== 'undefined';

	// ... [O restante da sua função _GET permanece o mesmo, pois as dependências já foram importadas condicionalmente acima] ...
	// Note: Mantive o corpo de _GET como no original, assumindo que as funções auxiliares internas estão corretas.

	// ------------------ Funções Auxiliares internas de _GET (mantidas do original) ------------------
	const buildFallbacks = (u) => {
		const c = [
			u,
			...(is_relative ? ['./' + u, '../' + u, '../../' + u] : []),
			...(isNODE
				? [
						path.join(ROOT, u),
						...(is_relative
							? [
									path.join(ROOT, './', u),
									path.join(ROOT, '../', u),
									path.join(ROOT, '../../', u),
							  ]
							: []),
				  ]
				: []),
		];
		return [
			...new Set(
				c.map((x) => x.replace(/(\/\/|\\?\\)/, '/')).map(String),
			),
		];
	};

	const loadLocal = (file) => {
		try {
			if (isNODE && fs.existsSync(file)) {
				return JSON.parse(fs.readFileSync(file, 'utf8'));
			}
		} catch (e) {
			return -105;
		}
		return -103;
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
		if (isNODE && !isProtocol) return -107;
		const r = await fetch(link);
		if (!r.ok) return -104;
		return r.json();
	};

	const tryPaths = async (paths) => {
		for (const p of paths) {
			console.log(` - ${p}`);
			try {
				const rr =
					isNODE && !isProtocol
						? loadLocal(p)
						: !hasFETCH && (!isNODE || isProtocol)
						? await loadViaHTTPS(p)
						: hasFETCH && (!isNODE || isProtocol)
						? await loadViaFetch(p)
						: -106;

				if (VReturn(rr)) return `:: ${rr}`;
				console.warn(rr);
			} catch (e) {
				console.log(e);
			}
		}
		return -102;
	};
	// ------------------ Fim das Funções Auxiliares internas de _GET ------------------

	const r = await tryPaths(buildFallbacks(url));
	if (VReturn(r, 1)) return r;
}

// --- Exportação Universal (Node.js CJS/ESM e Navegador) ---

// Exporta as funções e constantes usando ES Modules (padrão em navegadores e Node moderno)
export {
	isNODE,
	REGEX_PROTOCOL,
	REGEX_LOCAL,
	setItemLocalStorage,
	getItemLocalStorage,
	_GET,
};

// Também adiciona ao objeto global/window para compatibilidade com scripts antigos em navegadores
// ou para acesso via 'global' no Node caso o arquivo seja carregado de forma não-modular.
if (typeof globalThis !== 'undefined') {
	globalThis.isNODE = isNODE;
	globalThis.REGEX_PROTOCOL = REGEX_PROTOCOL;
	globalThis.REGEX_LOCAL = REGEX_LOCAL;
	globalThis.setItemLocalStorage = setItemLocalStorage;
	globalThis.getItemLocalStorage = getItemLocalStorage;
	globalThis._GET = _GET;
}
