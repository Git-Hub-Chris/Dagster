import {Table} from '@dagster-io/ui-components';
import * as React from 'react';

import {PolicyEvaluationCondition} from '../PolicyEvaluationCondition';

// eslint-disable-next-line import/no-default-export
export default {
  title: 'Asset Details/Automaterialize/PolicyEvaluationCondition',
  component: PolicyEvaluationCondition,
};

export const Default = () => {
  return (
    <Table $compact>
      <tbody>
        <tr>
          <td>
            <PolicyEvaluationCondition
              depth={0}
              icon="resource"
              label="All are true:"
              type="group"
            />
          </td>
        </tr>
        <tr>
          <td>
            <PolicyEvaluationCondition
              depth={1}
              icon="resource"
              label="Any are true:"
              type="group"
            />
          </td>
        </tr>
        <tr>
          <td>
            <PolicyEvaluationCondition
              depth={2}
              icon="wysiwyg"
              label="parent_updated"
              type="leaf"
            />
          </td>
        </tr>
        <tr>
          <td>
            <PolicyEvaluationCondition
              depth={2}
              icon="wysiwyg"
              label="is_missing"
              type="leaf"
              skipped
            />
          </td>
        </tr>
        <tr>
          <td>
            <PolicyEvaluationCondition depth={1} icon="resource" label="Not:" type="group" />
          </td>
        </tr>
        <tr>
          <td>
            <PolicyEvaluationCondition
              depth={2}
              icon="wysiwyg"
              label="parent_updated"
              type="leaf"
            />
          </td>
        </tr>
      </tbody>
    </Table>
  );
};
