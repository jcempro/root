/**
 * Environment detection for Node.js vs Browser
 * @type {boolean}
 */
const isNODE = typeof window === 'undefined';

/**
 * Cities validation module import
 */
const CIDADES = isNODE
	? require('../cidades.main.cjs')
	: typeof window !== `undefined`
	? window.cidades
	: globalThis.cidades;

/**
 * Radio ID network data source URL
 * @type {string}
 */
const __RPTDR_LNK = 'https://radioid.net/static/rptrs.json';

/**
 * Local data file path
 * @type {string}
 */
const PATH_FILE = 'rptrs.json';

/**
 * Brazilian states mapping (full names to abbreviations)
 * @type {Object}
 */
const estadosMap = {
	acre: 'ac',
	alagoas: 'al',
	amapa: 'ap',
	amapá: 'ap',
	amazonas: 'am',
	bahia: 'ba',
	ceara: 'ce',
	ceará: 'ce',
	'distrito federal': 'df',
	'espirito santo': 'es',
	'espírito santo': 'es',
	goias: 'go',
	goiás: 'go',
	maranhao: 'ma',
	maranhão: 'ma',
	'mato grosso': 'mt',
	'mato grosso do sul': 'ms',
	'minas gerais': 'mg',
	para: 'pa',
	pará: 'pa',
	paraiba: 'pb',
	paraíba: 'pb',
	parana: 'pr',
	paraná: 'pr',
	pernambuco: 'pe',
	piaui: 'pi',
	piauí: 'pi',
	'rio de janeiro': 'rj',
	'rio grande do norte': 'rn',
	'rio grande do sul': 'rs',
	rondonia: 'ro',
	rondônia: 'ro',
	roraima: 'rr',
	'santa catarina': 'sc',
	'sao paulo': 'sp',
	'são paulo': 'sp',
	sergipe: 'se',
	tocantins: 'to',
	// State abbreviations
	ac: 'ac',
	al: 'al',
	ap: 'ap',
	am: 'am',
	ba: 'ba',
	ce: 'ce',
	df: 'df',
	es: 'es',
	go: 'go',
	ma: 'ma',
	mt: 'mt',
	ms: 'ms',
	mg: 'mg',
	pa: 'pa',
	pb: 'pb',
	pr: 'pr',
	pe: 'pe',
	pi: 'pi',
	rj: 'rj',
	rn: 'rn',
	rs: 'rs',
	ro: 'ro',
	rr: 'rr',
	sc: 'sc',
	sp: 'sp',
	se: 'se',
	to: 'to',
};

/**
 * Cache for processed data
 * @type {Object|null}
 */
let cacheProcessado = null;

/**
 * Normalizes state names to standard abbreviations
 * @param {string} estado - State name or abbreviation
 * @returns {string} Normalized state abbreviation
 */
const normalizarEstado = (estado) =>
	estado
		? estadosMap[
				estado
					.toLowerCase()
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, '')
					.trim()
		  ] || ''
		: '';

/**
 * Converts timeslot linked string to numeric array
 * @param {string} ts_linked - Timeslot string (e.g., "TS1 TS2")
 * @returns {number[]} Array of timeslot numbers
 */
const converterTimeslot = (ts_linked) => {
	if (!ts_linked) return [];
	return ts_linked
		.replace(/TS/gi, '')
		.trim()
		.split(/\s+/)
		.map((num) => parseInt(num, 10))
		.filter((num) => !isNaN(num) && num > 0);
};

/**
 * Processes and validates city names with comprehensive cleaning
 * @param {string} city - Raw city name
 * @param {string} estadoSigla - State abbreviation for context
 * @returns {Promise<string>} Processed and validated city name
 */
const processarNomeCidade = async (city, estadoSigla) => {
	if (!city) return '';

	let cityLimpa = String(city);

	// Remove states and countries (only isolated words at the end)
	const padroesRemover = Object.keys(estadosMap).concat([
		'brazil',
		'brasil',
	]);

	if (estadoSigla) {
		const estadoAtual = Object.keys(estadosMap).find(
			(key) => estadosMap[key] === estadoSigla,
		);
		if (estadoAtual) {
			const padroesEstado = estadoAtual.split(' ');
			padroesEstado.forEach((padrao) => {
				cityLimpa = cityLimpa.replace(
					new RegExp(
						`[\\-\\s\\/\\,\\.]+${padrao}[\\-\\s\\/\\,\\.]*$`,
						'gi',
					),
					'',
				);
			});
		}
	}

	padroesRemover.forEach((padrao) => {
		cityLimpa = cityLimpa.replace(
			new RegExp(
				`[\\-\\s\\/\\,\\.]+${padrao}[\\-\\s\\/\\,\\.]*$`,
				'gi',
			),
			'',
		);
	});

	// Remove trailing symbols
	cityLimpa = cityLimpa.replace(/[\\-\\.\\/,\\|\\s]+$/, '').trim();

	// Remove leading symbols
	cityLimpa = cityLimpa.replace(/^[\\-\\.\\/,\\|\\s]+/, '').trim();

	// Replace internal symbols with spaces
	cityLimpa = cityLimpa.replace(/[\\-\\.\\/,\\|]+/g, ' ');

	// Final whitespace cleanup
	cityLimpa = cityLimpa.replace(/\s+/g, ' ').trim();

	// Validate against official cities database
	if (cityLimpa && cityLimpa.length > 1) {
		return await CIDADES.validarNomeCidade(cityLimpa);
	}

	// Fallback: return cleaned original name
	return commom.capitalizar(
		city
			.replace(/[\\-\\.\\/,\\|]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim(),
	);
};

/**
 * Processes individual radio repeater record
 * @param {Object} registro - Raw repeater data
 * @param {Object} contadorCidades - City counter for duplicate handling
 * @returns {Promise<Object|null>} Processed record or null if invalid
 */
async function processarRegistro(registro, contadorCidades) {
	const {
		state,
		country,
		status,
		locator,
		callsign,
		map_info,
		trustee,
		map,
		city,
		...novoReg
	} = registro;

	// Filter for active Brazilian repeaters only
	if (
		!/bra(s|z)il/i.test((country || '').trim()) ||
		(status || '').toLowerCase() !== 'active'
	)
		return null;

	const estadoSigla = normalizarEstado(state);
	if (!estadoSigla) return null;

	// Process city name with validation
	const cidadeProcessada = await processarNomeCidade(
		city,
		estadoSigla,
	);
	if (!cidadeProcessada) return null;

	// Convert numeric fields
	['frequency', 'offset', 'color_code', 'id'].forEach((campo) => {
		if (novoReg[campo] != null)
			novoReg[campo] = parseFloat(novoReg[campo]) || 0;
	});

	novoReg.info = {};

	// Field name mapping and restructuring
	if (novoReg.frequency !== undefined) {
		novoReg.rx = novoReg.frequency;
		delete novoReg.frequency;
	}

	if (novoReg.color_code !== undefined) {
		novoReg.color = novoReg.color_code;
		delete novoReg.color_code;
	}

	if (novoReg.ts_linked !== undefined) {
		novoReg.timeslot = converterTimeslot(novoReg.ts_linked);
		delete novoReg.ts_linked;
	}

	if (novoReg.id !== undefined) {
		novoReg.info.dmr_id = novoReg.id;
		delete novoReg.id;
	}

	if (novoReg.ipsc_network !== undefined) {
		novoReg.info.ipsc = novoReg.ipsc_network;
		delete novoReg.ipsc_network;
	}

	if (novoReg.assigned !== undefined) {
		novoReg.info.assigned = novoReg.assigned;
		delete novoReg.assigned;
	}

	// Calculate transmission frequency
	if (novoReg.rx !== undefined && novoReg.offset !== undefined) {
		novoReg.tx = parseFloat((novoReg.rx + novoReg.offset).toFixed(5));
	}

	// Generate standardized name with duplicate counter
	const chaveCidade = `${estadoSigla}:${cidadeProcessada}`;
	contadorCidades[chaveCidade] =
		(contadorCidades[chaveCidade] || 0) + 1;
	const contador = contadorCidades[chaveCidade];

	novoReg.name =
		contador > 1
			? `${estadoSigla.toUpperCase()}: ${cidadeProcessada} [${contador}]`
			: `${estadoSigla.toUpperCase()}: ${cidadeProcessada}`;

	// Capitalize remaining string fields
	Object.keys(novoReg).forEach((key) => {
		if (typeof novoReg[key] === 'string' && key !== 'name') {
			novoReg[key] = commom.capitalizar(novoReg[key]);
		}
	});

	return { estadoSigla, registro: novoReg };
}

/**
 * Main function to process radio repeater JSON data
 * @param {Function} resolverCaminhos - Path resolver function
 * @param {Function} carregarDados - Data loader function
 * @param {Function} salvarDados - Data saver function
 * @param {Function|null} callback - Completion callback
 * @param {Array} fontes - Data sources array
 * @param {string} storageKey - Cache storage key
 * @returns {Promise<Object>} Processing results
 */
async function processarJSON(
	resolverCaminhos,
	carregarDados,
	salvarDados,
	callback = null,
	fontes = [PATH_FILE, __RPTDR_LNK],
	storageKey = 'radioid.net',
) {
	try {
		// Load data from specified sources
		const jsonData = await carregarDados(fontes, storageKey);

		if (
			typeof jsonData !== 'object' ||
			!Array.isArray(jsonData?.rptrs)
		) {
			throw new Error(`JSON inválido. Esperado objeto com '.rptrs'`);
		}

		const estados = {};
		const contadorCidades = {};
		const resultados = {
			totalEstados: 0,
			totalRegistros: 0,
			registrosOriginais: jsonData.rptrs.length,
			arquivosGerados: [],
			estadosProcessados: [],
			contents: {},
		};

		// Process each repeater record
		for (const registro of jsonData.rptrs) {
			const processado = await processarRegistro(
				registro,
				contadorCidades,
			);
			if (processado) {
				const { estadoSigla, registro: regProcessado } = processado;
				if (!estados[estadoSigla]) estados[estadoSigla] = [];
				estados[estadoSigla].push(regProcessado);
			}
		}

		cacheProcessado = estados;

		// Save processed data per state
		for (const [estadoSigla, registros] of Object.entries(estados)) {
			registros.sort((a, b) => a.name.localeCompare(b.name));

			const caminhos = resolverCaminhos('', estadoSigla);

			const arquivoSalvo = await salvarDados(
				registros,
				caminhos,
				estadoSigla,
			);

			resultados.contents[estadoSigla] = registros;
			resultados.totalEstados++;
			resultados.totalRegistros += registros.length;
			resultados.arquivosGerados.push(arquivoSalvo);
			resultados.estadosProcessados.push(estadoSigla);

			console.log(
				`Estado ${estadoSigla.toUpperCase()}: ${
					registros.length
				} registros`,
			);
		}

		console.log(
			`\nProcessado: ${resultados.totalEstados} estados, ${resultados.totalRegistros} registros (original: ${resultados.registrosOriginais})`,
		);

		if (typeof callback === 'function') {
			callback(null, resultados);
		}

		return resultados;
	} catch (error) {
		console.error('Erro ao processar:', error);

		if (typeof callback === 'function') {
			callback(error, null);
		}

		throw error;
	}
}

// Environment-specific exports
if (!isNODE) {
	window.processarJSON = processarJSON;
} else {
	module.exports = {
		processarJSON,
	};
}
