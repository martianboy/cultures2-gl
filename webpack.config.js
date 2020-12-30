const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
// const InterpolateHtmlPlugin = require("interpolate-html-plugin");

module.exports = {
  mode: "development",

  entry: "./src/index.tsx",
  output: {
    filename: "bundle.js",
    publicPath: "/",
    globalObject: "this"
  },

  experiments: {
    // asyncWebAssembly: true,
    syncWebAssembly: true,
  },

  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: "webassembly/sync"
      },
      {
        test: /\.tsx?$/,
        use: ["ts-loader"]
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
        loader: require.resolve("url-loader"),
        options: {
          name: "static/media/[name].[hash:8].[ext]"
        }
      },
      {
        test: /\.glsl$/i,
        use: "raw-loader"
      }
    ]
  },

  resolve: {
    extensions: [".js", ".ts", ".tsx"],
    fallback: {
      util: require.resolve('util/')
    }
  },

  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      template: path.resolve(__dirname, "./public/index.html")
    }),

    // Makes some environment variables available in index.html.
    // The public URL is available as %PUBLIC_URL% in index.html, e.g.:
    // <link rel="icon" href="%PUBLIC_URL%/favicon.ico">
    // It will be an empty string unless you specify "homepage"
    // in `package.json`, in which case it will be the pathname of that URL.
    // new InterpolateHtmlPlugin({
    //   PUBLIC_URL: ""
    // })
  ],

  devServer: {
    contentBase: path.join(__dirname, "public"),
    contentBasePublicPath: "/",
    compress: true,
    port: 9000
  }
};
