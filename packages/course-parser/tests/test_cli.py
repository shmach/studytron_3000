import json
from pathlib import Path

import pytest

from course_parser.cli import main

FIXTURES_DIR = Path(__file__).parent / 'fixtures'
JAVA = 'java-para-quem-programa'


def test_single_course_dir_outputs_one_bundle(capsys):
    exit_code = main([str(FIXTURES_DIR / JAVA)])

    assert exit_code == 0
    data = json.loads(capsys.readouterr().out)
    assert data['course']['slug'] == JAVA
    assert len(data['lessons']) == 1
    assert data['attempts'][0]['score'] == '5/7'


def test_vault_root_outputs_list_of_bundles(capsys):
    exit_code = main([str(FIXTURES_DIR)])

    assert exit_code == 0
    data = json.loads(capsys.readouterr().out)
    assert [b['course']['slug'] for b in data] == ['arduino-cpp', JAVA]


def test_dates_are_serialized_as_iso_strings(capsys):
    main([str(FIXTURES_DIR / JAVA)])

    data = json.loads(capsys.readouterr().out)
    assert data['course']['created'] == '2026-08-30'
    assert data['course']['modules'][0]['topics'][0]['meta']['last_reviewed'] == '2026-08-30'


def test_compact_flag_drops_indentation(capsys):
    main(['--compact', str(FIXTURES_DIR / 'arduino-cpp')])

    out = capsys.readouterr().out
    assert out.count('\n') == 1


def test_missing_path_returns_error_exit_code(capsys, tmp_path):
    exit_code = main([str(tmp_path / 'nope')])

    assert exit_code == 1
    assert 'nope' in capsys.readouterr().err


def test_parse_error_returns_error_exit_code(capsys, tmp_path):
    (tmp_path / '00-curriculum.md').write_text('# no front matter\n')

    exit_code = main([str(tmp_path)])

    assert exit_code == 1
    assert 'front matter' in capsys.readouterr().err


def test_no_arguments_is_a_usage_error():
    with pytest.raises(SystemExit) as exc_info:
        main([])

    assert exc_info.value.code == 2
