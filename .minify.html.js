import { minify } from 'html-minifier-terser';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

function processDir(dir) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			processDir(fullPath);
		} else if (entry.isFile() && entry.name.endsWith('.main.html')) {
			const baseName = entry.name.replace('.main.html', '.html');
			const destPath = path.join(dir, baseName);
			const content = fs.readFileSync(fullPath, 'utf8');

			minify(content, {
				collapseWhitespace: true,
				removeComments: true,
				removeOptionalTags: true,
				removeRedundantAttributes: true,
				useShortDoctype: true,
				minifyCSS: true,
				minifyJS: true,
			})
				.then((minified) => {
					fs.writeFileSync(destPath, minified, 'utf8');
					console.log(
						`✅ Minificado: ${path.relative(rootDir, destPath)}`,
					);
				})
				.catch((err) =>
					console.error(
						`❌ Erro ao minificar ${fullPath}:`,
						err.message,
					),
				);
		}
	}
}

processDir(rootDir);
