import {execFileSync} from 'child_process';
import fs from 'fs';
import path from 'path';

import {addTypenameToDocument} from '@apollo/client/utilities';
import {print} from 'graphql/language/printer';

/**
 * Why is this script structured as a Jest test? Jest goes to great lengths to
 * setup a NodeJS execution environment that also mimics a browser, so we can read/
 * write to the filesystem but ALSO load all of the application code (and retrieve
 * the query objects), etc. We could set all this up (new tsconfig, jsdom, etc.) but
 * leveraging Jest is easiest.
 */

// collect mocks from various tests in the codebase
import {MOCKS as SVGMocks} from '../testing/SVGMocks';

const dagsterRoot = path.resolve(path.join(__dirname, '..', '..', '..', '..'));

// eslint-disable-next-line jest/expect-expect
it(`builds mocks`, () => {
  for (const mock of SVGMocks) {
    const query = print(addTypenameToDocument(mock.query))
      .replace(/[\n\r]/g, '')
      .replace(/[ ][ ]+/g, ' ');
    const vars = mock.variables ? `-v '${JSON.stringify(mock.variables)}'` : '';
    const repo = `${dagsterRoot}/${mock.repo || 'examples/airline_demo'}/${
      mock.workspace ? 'workspace' : 'repository'
    }.yaml`;

    const args = ['-y', repo, '-t', query];
    if (vars) {
      args.push('-v', JSON.stringify(mock.variables));
    }
    execFileSync('dagster-graphql', args, { stdio: 'pipe', encoding: 'utf-8' });
    fs.writeFileSync(mock.filepath, execFileSync('dagster-graphql', args));

    if (JSON.parse(fs.readFileSync(mock.filepath).toString()).errors) {
      throw new Error(`Failed to generate ${mock.filepath}. See file for GraphQL error.`);
    }
    console.log(`Saved ${mock.filepath}`);
  }

  console.log(`Done.`);
});
