# Third-Party Notices

This project incorporates material from the open source projects and external services listed below. We are grateful to these communities for their contributions.

## Production Dependencies

| Package | Version | License | Copyright | Homepage |
|---------|---------|---------|-----------|----------|
| [react](https://github.com/facebook/react) | ^18.3.1 | MIT | © Meta Platforms, Inc. and affiliates | https://react.dev |
| [react-dom](https://github.com/facebook/react) | ^18.3.1 | MIT | © Meta Platforms, Inc. and affiliates | https://react.dev |
| [react-router-dom](https://github.com/remix-run/react-router) | ^7.0.2 | MIT | © React Training LLC 2015–2019, Remix Software Inc. 2020–2021, Shopify Inc. 2022–2023 | https://reactrouter.com |
| [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) | ^8.17.10 | MIT | © 2019–2025 Poimandres | https://docs.pmnd.rs/react-three-fiber |
| [@react-three/drei](https://github.com/pmndrs/drei) | ^9.114.3 | MIT | © 2020 react-spring | https://github.com/pmndrs/drei |
| [three](https://github.com/mrdoob/three.js) | ^0.160.1 | MIT | © 2010–2026 three.js authors | https://threejs.org |
| [@tanstack/react-query](https://github.com/TanStack/query) | ^5.62.0 | MIT | © 2021–present Tanner Linsley | https://tanstack.com/query |
| [zustand](https://github.com/pmndrs/zustand) | ^5.0.1 | MIT | © 2019 Paul Henschel | https://zustand-demo.pmnd.rs |
| [zod](https://github.com/colinhacks/zod) | ^3.23.8 | MIT | © 2025 Colin McDonnell | https://zod.dev |
| [sonner](https://github.com/emilkowalski/sonner) | ^1.7.0 | MIT | © Emil Kowalski | https://sonner.emilkowal.ski |
| [idb](https://github.com/jakearchibald/idb) | ^8.0.0 | ISC | © 2016 Jake Archibald | https://github.com/jakearchibald/idb |
| [dompurify](https://github.com/cure53/DOMPurify) | ^3.2.4 | MPL-2.0 OR Apache-2.0 | © 2015–2026 Mario Heiderich, Cure53 | https://github.com/cure53/DOMPurify |
| [web-ifc](https://github.com/ThatOpen/engine_web-ifc) | ^0.0.77 | MPL-2.0 | © That Open Company | https://thatopen.github.io/engine_web-ifc/docs/ |

## Redistributed Decoder Binaries

Since Issue #586 these files are copied **unmodified** from `node_modules` into the build output and served from this site instead of a public CDN (see `src/lib/decoderAssets.ts`).

### Draco Decoder (shipped with three.js)

- **Copied from:** `three/examples/jsm/libs/draco/gltf/` (`draco_decoder.wasm`, `draco_wasm_wrapper.js`, `draco_decoder.js`)
- **Served at:** `decoders/draco/gltf/`
- **License:** Apache-2.0 ([google/draco](https://github.com/google/draco), © Google LLC), redistributed inside the MIT-licensed [three.js](https://github.com/mrdoob/three.js) package
- **Purpose:** Draco-compressed 3D model decoding (GLTF/GLB)

### web-ifc WASM Runtime

- **Copied from:** `web-ifc/` (`web-ifc.wasm`, plus `web-ifc-mt.wasm` when present)
- **Served at:** `decoders/web-ifc/`
- **License:** MPL-2.0 ([ThatOpen/engine_web-ifc](https://github.com/ThatOpen/engine_web-ifc)); files are unmodified, source is available at the linked repository
- **Purpose:** IFC (Industry Foundation Classes) file parsing via WebAssembly

## External Services

### corsproxy.io

- **URL:** `https://corsproxy.io/`
- **License:** Proprietary service; free for local development origins
- **Purpose:** CORS proxy fallback for cross-origin WP/Woo API requests
- **Terms:** https://corsproxy.io/tos/

### AllOrigins (allorigins.win)

- **URL:** `https://api.allorigins.win/`
- **License:** MIT (source: [gnuns/AllOrigins](https://github.com/gnuns/allOrigins))
- **Purpose:** CORS proxy fallback for cross-origin API requests

## License Texts

### MIT License

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### ISC License

```
Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
```

### Apache License 2.0

The full text of the Apache License 2.0 is available at:
https://www.apache.org/licenses/LICENSE-2.0

Key terms: Licensed works may be used, reproduced, modified, and distributed
freely. Modified files must carry prominent notices. A patent license is
granted from each contributor. The license does not grant trademark rights.
Apache-2.0 is compatible with MIT, ISC, and MPL-2.0 licenses.

### Mozilla Public License 2.0 (MPL-2.0)

The full text of the MPL-2.0 is available at:
https://www.mozilla.org/en-US/MPL/2.0/

Key obligations: If you modify any file licensed under MPL-2.0, you must make
the modified source of that file available under MPL-2.0. Unmodified files and
your own project files are not affected. MPL-2.0 is compatible with MIT, ISC,
Apache-2.0, and GPL licenses.
