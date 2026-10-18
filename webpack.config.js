const path = require('path');

const shared = {
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader',
                ],
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.jsx'],
        alias: {
            react: 'preact/compat',
            'react-dom': 'preact/compat',
        },
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
};

module.exports = [
    {
        ...shared,
        name: 'site',
        entry: {
            // Console bundle embedded in public/index.html.
            dist: './src/bootstrap.ts',
            // Demo page bundle copied to public/demo.js.
            demo: './src/demo/demo.ts',
        },
    },
    {
        ...shared,
        name: 'userscript',
        // Same entry, unminified: userscript hosts such as Greasy Fork reject minified code.
        entry: { userscript: './src/bootstrap.ts' },
        optimization: { minimize: false },
    },
];
