/**
 * Environment detection for Node.js vs Browser
 * @type {boolean}
 */
const isNODE = typeof window === 'undefined';

/**
 * Node.js module imports (conditional)
 */
const fs = isNODE ? require('fs') : null;
const path = isNODE ? require('path') : null;

/**
 * Common utilities module import (cross-environment)
 */
const commom = isNODE
	? require('../../../../@assets/js/common.main.cjs')
	: typeof window !== `undefined`
	? window.commom
	: globalThis.commom;

/**
 * Radio ID network data processor import
 */
const radioidnet = isNODE
	? require('./sources/radioid.net.main.cjs')
	: typeof window !== `undefined`
	? window.commom
	: globalThis.commom;

/**
 * Root directory path (Node.js only)
 * @type {string}
 */
const ROOT = isNODE ? process.cwd().split('/radio/')[0] : '';

/**
 * Metadata directory path (normalized for cross-platform compatibility)
 * @type {string}
 */
const META = ((x) => {
	return isNODE ? path.resolve(x) : x.replace(/\\/, `/`);
})(`${ROOT}/radio/repetidoras/meta`);

/**
 * Resolves file paths based on environment and state parameters
 * @param {string} basePath - Base directory path
 * @param {string} estadoSigla - State abbreviation (e.g., 'SP', 'RJ')
 * @returns {Object} Path configuration object
 */
function resolverCaminhos(basePath, estadoSigla = '') {
	const point = estadoSigla.trim() !== `` || commom.isFile(basePath);
	basePath = basePath.replace(/^s*[\/\\]+/, '');
	basePath = point
		? commom.joinPath(basePath, `/uf/${estadoSigla}/`)
		: basePath;

	const nomeBase = commom
		.joinPath(META, basePath)
		.replace('.json', '');
	return {
		json: `${`${nomeBase}${point ? '' : '.'}${estadoSigla}`}.json`,
		base: nomeBase,
		estado: estadoSigla,
	};
}

/**
 * Loads JSON data from multiple sources with fallback strategy
 * @param {string|string[]} fontes - Source URLs or file paths
 * @param {string} storageKey - Cache key for browser storage
 * @returns {Promise<Object>} Parsed JSON data
 */
async function carregarDados(fontes, storageKey) {
	let jsonData;

	jsonData = await commom.getItemLocalStorage(
		storageKey,
		async () => {
			for (const value of Array.isArray(fontes) ? fontes : [fontes]) {
				try {
					const r = await commom._GET(value);
					if (
						commom.V_RETURN(r) &&
						(isNODE || (r && typeof r === 'object'))
					) {
						return r;
					}
				} catch (e) {
					console.log(e);
					continue;
				}
			}
			throw new Error('Não foi possível carregar nenhum arquivo');
		},
	);

	return jsonData;
}

/**
 * Saves processed data to appropriate destination based on environment
 * @param {Object} registros - Data records to save
 * @param {Object} caminhos - Path configuration from resolverCaminhos
 * @param {string} estadoSigla - State abbreviation
 * @param {string} formato - Output format ('json' only supported)
 * @returns {Promise<string>} Path to saved file
 */
async function salvarDados(
	registros,
	caminhos,
	estadoSigla = ``,
	formato = 'json',
) {
	const { json: jsonNomeArquivo } = caminhos;
	const estadoJSON = registros;

	if (formato === 'json') {
		const conteudo = JSON.stringify(estadoJSON, null, 0);

		if (isNODE) {
			const dir = path.dirname(jsonNomeArquivo);
			if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
			fs.writeFileSync(jsonNomeArquivo, conteudo);
		} else {
			const blob = new Blob([conteudo], {
				type: 'application/json',
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = jsonNomeArquivo.split('/').pop();
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			console.log(`Download iniciado: ${jsonNomeArquivo}`);
		}
	} else {
		throw new Error(`Formato '${formato}' não suportado`);
	}

	return jsonNomeArquivo;
}

// Environment-specific execution
if (!isNODE) {
	/**
	 * Browser environment initialization
	 */
	if (document.readyState === 'loading') {
		document.addEventListener(
			'DOMContentLoaded',
			criarInterfaceNavegador,
		);
	} else {
		criarInterfaceNavegador();
	}
} else {
	/**
	 * Node.js environment execution
	 * Processes radio ID network data and saves results
	 */
	radioidnet.processarJSON(
		resolverCaminhos,
		carregarDados,
		salvarDados,
		(error, resultados) => {
			salvarDados(resultados.contents, {
				json: `${META}/radioidnet.json`,
			});
		},
	);
}
