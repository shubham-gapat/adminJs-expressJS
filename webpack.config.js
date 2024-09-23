export const module = {
    rules: [
        {
            test: /\.ts$/,
            use: 'ts-loader',
            exclude: /node_modules/,
        },
    ],
};
export const resolve = {
    extensions: ['.ts', '.js'],
};
  