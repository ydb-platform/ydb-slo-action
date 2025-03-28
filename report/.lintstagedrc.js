export default {
	'**/*.ts': (filenames) => {
		return [`bun run lint ${filenames.join(' ')}`, `bun run format ${filenames.join(' ')}`, `npm run build`]
	},
}
